import { config } from "../config.js";
import { graphPost } from "../graph.js";

/** WhatsApp Cloud API orqali matnli xabar yuboradi. */
export function sendWhatsAppMessage(to, text) {
  return graphPost(
    `${config.whatsappPhoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    config.whatsappToken
  );
}

/** Kiruvchi WhatsApp xabarini "o'qildi" deb belgilaydi. */
export function markWhatsAppRead(messageId) {
  return graphPost(
    `${config.whatsappPhoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    },
    config.whatsappToken
  );
}
