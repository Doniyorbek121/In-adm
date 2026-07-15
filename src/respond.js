import { generateReply } from "./ai.js";
import { isActive } from "./subscription.js";
import { notifyHandoff } from "./notify.js";
import {
  recordMessage,
  isHandoffRequest,
  isManual,
  startHandoff,
} from "./engagement.js";

const HANDOFF_REPLY =
  "Iltimos, biroz kuting 🙏 Sizni jonli operatorimizga uladik — tez orada javob berishadi.";

/**
 * Kiruvchi xabarni to'liq qayta ishlaydi:
 * obuna tekshiruvi → operator rejimi → handoff → statistika → AI javob.
 *
 * Qaytaradi: { reply } yoki reply=null (javob yubormaslik kerak).
 * channel: "instagram" | "facebook" | "whatsapp"
 */
export async function processMessage(tenant, channel, chatKey, { text = "", media = [] }) {
  // 1. Obuna faol emasmi — bot javob bermaydi
  if (!isActive(tenant)) {
    console.log(
      `[${channel}] ${tenant.businessName}: obuna faol emas — javob berilmadi`
    );
    return { reply: null };
  }

  // 2. Statistika
  recordMessage(tenant, channel, chatKey, text);

  // 3. Chat qo'lda rejimda bo'lsa (operator boshqarmoqda) — bot jim
  if (isManual(tenant, chatKey)) {
    console.log(`[${channel}] ${tenant.businessName}: ${chatKey} operator rejimida`);
    return { reply: null };
  }

  // 4. Mijoz operatorni chaqirdimi
  if (isHandoffRequest(text)) {
    startHandoff(tenant, channel, chatKey);
    notifyHandoff(tenant, channel, chatKey).catch(() => {}); // Telegram (bo'lsa)
    console.log(`[${channel}] ${tenant.businessName}: ${chatKey} operator chaqirdi`);
    return { reply: HANDOFF_REPLY };
  }

  // 5. AI javob
  const reply = await generateReply(tenant, chatKey, { text, media });
  return { reply };
}
