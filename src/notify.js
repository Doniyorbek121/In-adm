// Telegram orqali biznes egasiga bildirishnoma yuboradi.
// TELEGRAM_BOT_TOKEN berilgan bo'lsagina ishlaydi (platforma darajasida bitta bot).

const botToken = process.env.TELEGRAM_BOT_TOKEN || "";

export const telegramAvailable = Boolean(botToken);

/** Berilgan chat ID'ga xabar yuboradi. Xato bo'lsa false. */
export async function sendTelegram(chatId, text) {
  if (!botToken || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Telegram xatosi:", JSON.stringify(data).slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Telegram so'rovida xato:", err.message);
    return false;
  }
}

/** Biznes egasiga operator chaqirilgani haqida xabar beradi. */
export function notifyHandoff(tenant, channel, chatKey) {
  const chatId = tenant.settings?.telegramChatId;
  if (!chatId) return Promise.resolve(false);
  return sendTelegram(
    chatId,
    `👤 <b>Operator chaqirildi!</b>\n\nBiznes: ${tenant.businessName}\nKanal: ${channel}\nMijoz: ${chatKey}\n\nIltimos, ${channel} ilovasidan javob bering.`
  );
}
