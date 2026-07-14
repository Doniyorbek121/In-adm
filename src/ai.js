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

// Provayder tanlash: GEMINI_API_KEY bo'lsa Gemini,
// ANTHROPIC_API_KEY bo'lsa Claude, ikkalasi ham yo'q bo'lsa kalit so'z rejimi
const geminiKey = process.env.GEMINI_API_KEY || "";
const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

export const aiProvider = !businessInfo
  ? "none"
  : geminiKey
    ? "gemini"
    : anthropicKey
      ? "claude"
      : "none";

export const aiEnabled = aiProvider !== "none";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const CLAUDE_MODEL = process.env.AI_MODEL || "claude-opus-4-8";

const anthropicClient = aiProvider === "claude" ? new Anthropic() : null;

// Har bir mijoz bilan suhbat tarixi (xotirada, oxirgi 10 ta xabar)
const conversations = new Map();
const MAX_HISTORY = 10;

const systemPrompt = `Sen kichik biznesning mijozlar bilan ishlash bo'yicha yordamchisisan. Instagram, Facebook va WhatsApp orqali yozgan mijozlarga javob berasan.

Qoidalar:
- Faqat quyidagi "Biznes ma'lumotlari" bo'limidagi faktlarga tayanib javob ber. Ma'lumot bo'lmasa, o'ylab topma — "bu haqda operatorimiz aniqlik kiritadi" deb ayt.
- Mijoz qaysi tilda yozsa, o'sha tilda javob ber (o'zbek, rus yoki ingliz).
- Qisqa va samimiy yoz — bu messenjer suhbati, 2-3 jumladan oshirma.
- Narx, manzil, yetkazib berish kabi savollarga aniq raqamlar bilan javob ber.
- Buyurtma bermoqchi bo'lgan mijozdan kerakli ma'lumotlarni so'ra (qaysi mahsulot, nechta, manzil).

# Biznes ma'lumotlari

${businessInfo}`;

/** Gemini API orqali javob oladi. history: [{role, text}] */
async function askGemini(history, text) {
  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Gemini API xatosi (${res.status}): ${JSON.stringify(data.error || data)}`
    );
  }

  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text || "")
    .join("")
    .trim();
}

/** Claude API orqali javob oladi. history: [{role, text}] */
async function askClaude(history, text) {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: "user", content: text },
  ];

  const response = await anthropicClient.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/**
 * Mijoz xabariga AI javob qaytaradi.
 * AI ishlamasa (kalit yo'q, xato, limit) — kalit so'z qoidalariga qaytadi,
 * shunda bot hech qachon javobsiz qolmaydi.
 */
export async function generateReply(userId, text) {
  if (!aiEnabled) return findReply(text);

  const history = conversations.get(userId) || [];

  try {
    const reply =
      aiProvider === "gemini"
        ? await askGemini(history, text)
        : await askClaude(history, text);

    if (!reply) return findReply(text);

    // Suhbat tarixini yangilaymiz (oxirgi MAX_HISTORY ta xabar)
    const updated = [
      ...history,
      { role: "user", text },
      { role: "assistant", text: reply },
    ].slice(-MAX_HISTORY);
    conversations.set(userId, updated);

    return reply;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude API xatosi (${error.status}):`, error.message);
    } else {
      console.error("AI javob berishda xato:", error.message || error);
    }
    return findReply(text);
  }
}
