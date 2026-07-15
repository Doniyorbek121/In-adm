import Anthropic from "@anthropic-ai/sdk";
import { findReply } from "./autoReply.js";
import { persist } from "./db.js";

// Global (zaxira) kalitlar — foydalanuvchi o'z kalitini kiritmagan bo'lsa ishlatiladi
const globalGeminiKey = process.env.GEMINI_API_KEY || "";
const globalAnthropicKey = process.env.ANTHROPIC_API_KEY || "";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const CLAUDE_MODEL = process.env.AI_MODEL || "claude-opus-4-8";

const anthropicClient = globalAnthropicKey ? new Anthropic() : null;

// Suhbat tarixi tenant.chats[chatKey] da saqlanadi (bazada, server o'chsa yo'qolmaydi).
const MAX_HISTORY = 10;
const MAX_CHATS = 300; // bir biznesda saqlanadigan suhbatlar soni

function buildSystemPrompt(tenant) {
  return `Sen "${tenant.businessName || "biznes"}" nomli biznesning mijozlar bilan ishlash bo'yicha yordamchisisan. Instagram, Facebook va WhatsApp orqali yozgan mijozlarga javob berasan.

Qoidalar:
- Faqat quyidagi "Biznes ma'lumotlari" bo'limidagi faktlarga tayanib javob ber. Ma'lumot bo'lmasa, o'ylab topma — "bu haqda operatorimiz aniqlik kiritadi" deb ayt.
- Mijoz qaysi tilda yozsa, o'sha tilda javob ber (o'zbek, rus yoki ingliz).
- Xuddi tirik operator kabi tabiiy, samimiy va iliq yoz. O'zingni robot deb tanishtirma.
- Qisqa yoz — bu messenjer suhbati, 2-3 jumladan oshirma.
- Mijoz ovozli xabar yuborsa — eshitib, mazmuniga javob ber. Rasm yoki video yuborsa — ko'rib, nimaligini aniqlab, biznesga bog'lab javob ber (masalan, mahsulot rasmi bo'lsa narxi va borligini ayt).
- Narx, manzil, yetkazib berish kabi savollarga aniq raqamlar bilan javob ber.
- Buyurtma bermoqchi bo'lgan mijozdan kerakli ma'lumotlarni so'ra (qaysi mahsulot, nechta, manzil).

# Biznes ma'lumotlari

${tenant.businessInfo}`;
}

/** Gemini — matn + ovoz + rasm + video birga tahlil qilinadi */
async function askGemini(apiKey, systemPrompt, history, text, media) {
  const parts = [
    ...media.map((m) => ({
      inline_data: { mime_type: m.mimeType, data: m.data },
    })),
  ];
  if (text) parts.push({ text });
  if (parts.length === 0) return "";

  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
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

  return (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
}

/** Claude — matn va rasm (ovoz/video Claude'da qo'llanmaydi) */
async function askClaude(systemPrompt, history, text, media) {
  const content = [];
  let unsupported = 0;
  for (const m of media) {
    if (m.mimeType.startsWith("image/")) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: m.mimeType, data: m.data },
      });
    } else {
      unsupported++;
    }
  }
  let userText = text || "";
  if (unsupported > 0) {
    userText =
      `[Mijoz ${unsupported} ta ovozli/video xabar yubordi — mazmunini ko'ra olmading. ` +
      `Undan xabarini matnda yozishini muloyim so'ra.] ${userText}`;
  }
  if (userText) content.push({ type: "text", text: userText });
  if (content.length === 0) return "";

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: "user", content },
  ];

  const response = await anthropicClient.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
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
 * Mijoz xabariga AI javob qaytaradi (multi-tenant, multimodal).
 *
 * tenant   — db'dagi foydalanuvchi (biznes egasi)
 * chatKey  — mijozning platformadagi ID'si
 * text     — mijoz yozgan matn (bo'lishi shart emas)
 * media    — [{mimeType, data(base64)}] — rasm/ovoz/video (bo'lishi shart emas)
 *
 * AI ishlamasa kalit so'z qoidalariga qaytadi — bot javobsiz qolmaydi.
 */
export async function generateReply(tenant, chatKey, { text = "", media = [] } = {}) {
  const geminiKey = tenant.geminiApiKey || globalGeminiKey;
  const provider =
    tenant.businessInfo && geminiKey
      ? "gemini"
      : tenant.businessInfo && anthropicClient
        ? "claude"
        : "none";

  if (provider === "none") {
    return findReply(text) ;
  }

  tenant.chats ||= {};
  const history = tenant.chats[chatKey] || [];
  const systemPrompt = buildSystemPrompt(tenant);

  try {
    const reply =
      provider === "gemini"
        ? await askGemini(geminiKey, systemPrompt, history, text, media)
        : await askClaude(systemPrompt, history, text, media);

    if (!reply) return findReply(text);

    const summary = text || "[media xabar]";
    tenant.chats[chatKey] = [
      ...history,
      { role: "user", text: summary },
      { role: "assistant", text: reply },
    ].slice(-MAX_HISTORY);

    // Suhbatlar soni cheklovi — eng eskilarini o'chiramiz (xotira/fayl o'smasligi uchun)
    const keys = Object.keys(tenant.chats);
    if (keys.length > MAX_CHATS) {
      for (const k of keys.slice(0, keys.length - MAX_CHATS)) delete tenant.chats[k];
    }
    persist();

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
