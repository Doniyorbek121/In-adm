import { graphPost } from "../graph.js";

/** WhatsApp Cloud API orqali matnli xabar yuboradi. */
export function sendWhatsAppMessage(tenant, to, text) {
  return graphPost(
    `${tenant.meta.whatsappPhoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    tenant.meta.whatsappToken
  );
}

/** Kiruvchi WhatsApp xabarini "o'qildi" deb belgilaydi. */
export function markWhatsAppRead(tenant, messageId) {
  return graphPost(
    `${tenant.meta.whatsappPhoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    },
    tenant.meta.whatsappToken
  );
}
