import { findReply } from "../autoReply.js";
import {
  sendWhatsAppMessage,
  markWhatsAppRead,
} from "../services/whatsapp.js";

/** WhatsApp webhook (object: "whatsapp_business_account") hodisalarini qayta ishlaydi. */
export async function handleWhatsAppEntry(entry) {
  for (const change of entry.changes || []) {
    if (change.field !== "messages") continue;

    for (const message of change.value?.messages || []) {
      if (message.type !== "text") continue;

      const from = message.from;
      const text = message.text?.body;
      if (!from || !text) continue;

      const reply = findReply(text);
      console.log(`[WhatsApp] ${from}: "${text}" -> javob yuborilmoqda`);
      await markWhatsAppRead(message.id);
      await sendWhatsAppMessage(from, reply);
    }
  }
}
