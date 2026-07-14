import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { findReply } from "./autoReply.js";

const businessPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "business.md"
);

const businessInfo = existsSync(businessPath)
  ? readFileSync(businessPath, "utf8")
  : "";

const AI_MODEL = process.env.AI_MODEL || "claude-opus-4-8";

// ANTHROPIC_API_KEY berilmagan bo'lsa AI o'chiq — kalit so'z qoidalari ishlaydi
export const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY && businessInfo);

const client = aiEnabled ? new Anthropic() : null;

// Har bir mijoz bilan suhbat tarixi (xotirada, oxirgi 10 ta xabar)
const conversations = new Map();
const MAX_HISTORY = 10;

const systemBlocks = [
  {
    type: "text",
    text: `Sen kichik biznesning mijozlar bilan ishlash bo'yicha yordamchisisan. Instagram, Facebook va WhatsApp orqali yozgan mijozlarga javob berasan.

Qoidalar:
- Faqat quyidagi "Biznes ma'lumotlari" bo'limidagi faktlarga tayanib javob ber. Ma'lumot bo'lmasa, o'ylab topma — "bu haqda operatorimiz aniqlik kiritadi" deb ayt.
- Mijoz qaysi tilda yozsa, o'sha tilda javob ber (o'zbek, rus yoki ingliz).
- Qisqa va samimiy yoz — bu messenjer suhbati, 2-3 jumladan oshirma.
- Narx, manzil, yetkazib berish kabi savollarga aniq raqamlar bilan javob ber.
- Buyurtma bermoqchi bo'lgan mijozdan kerakli ma'lumotlarni so'ra (qaysi mahsulot, nechta, manzil).

# Biznes ma'lumotlari

${businessInfo}`,
    cache_control: { type: "ephemeral" },
  },
];

/**
 * Mijoz xabariga AI javob qaytaradi.
 * AI ishlamasa (kalit yo'q, xato, limit) — kalit so'z qoidalariga qaytadi,
 * shunda bot hech qachon javobsiz qolmaydi.
 */
export async function generateReply(userId, text) {
  if (!aiEnabled) return findReply(text);

  const history = conversations.get(userId) || [];
  const messages = [...history, { role: "user", content: text }];

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemBlocks,
      messages,
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!reply) return findReply(text);

    // Suhbat tarixini yangilaymiz (oxirgi MAX_HISTORY ta xabar)
    const updated = [
      ...messages,
      { role: "assistant", content: reply },
    ].slice(-MAX_HISTORY);
    conversations.set(userId, updated);

    return reply;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Claude API kaliti noto'g'ri — .env dagi ANTHROPIC_API_KEY ni tekshiring");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("Claude API limiti tugadi — kalit so'z rejimiga o'tildi");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Claude API xatosi (${error.status}):`, error.message);
    } else {
      console.error("AI javob berishda xato:", error);
    }
    return findReply(text);
  }
}
