import { generateReply } from "../ai.js";
import { fetchWhatsAppMedia } from "../media.js";
import {
  sendWhatsAppMessage,
  markWhatsAppRead,
} from "../services/whatsapp.js";

/** WhatsApp webhook (object: "whatsapp_business_account") hodisalarini qayta ishlaydi. */
export async function handleWhatsAppEntry(tenant, entry) {
  for (const change of entry.changes || []) {
    if (change.field !== "messages") continue;

    for (const message of change.value?.messages || []) {
      const from = message.from;
      if (!from) continue;

      let text = "";
      const media = [];

      if (message.type === "text") {
        text = message.text?.body || "";
      } else if (["image", "audio", "video", "voice", "document"].includes(message.type)) {
        const mediaObj = message[message.type];
        text = mediaObj?.caption || "";
        if (mediaObj?.id) {
          try {
            media.push(
              await fetchWhatsAppMedia(mediaObj.id, tenant.meta.whatsappToken)
            );
          } catch (err) {
            console.error("WhatsApp mediani yuklab bo'lmadi:", err.message);
          }
        }
      } else {
        continue; // sticker, location va h.k. — hozircha o'tkazib yuboramiz
      }

      if (!text && media.length === 0) continue;

      console.log(
        `[WhatsApp] ${tenant.businessName}: ${from} -> "${text}" (${media.length} media, tur: ${message.type})`
      );
      await markWhatsAppRead(tenant, message.id);
      const reply = await generateReply(tenant, from, { text, media });
      await sendWhatsAppMessage(tenant, from, reply);
    }
  }
}
