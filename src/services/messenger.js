import { graphPost } from "../graph.js";

/** Facebook Messenger orqali xabar yuboradi. */
export function sendMessengerMessage(tenant, psid, text) {
  return graphPost(
    "me/messages",
    {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text },
    },
    tenant.meta.pageAccessToken
  );
}

/** "Yozmoqda…" ko'rsatkichi (tirik operator taassuroti). */
export function showTyping(tenant, psid) {
  return graphPost(
    "me/messages",
    { recipient: { id: psid }, sender_action: "typing_on" },
    tenant.meta.pageAccessToken
  );
}

/** Facebook post kommentiga javob yozadi. */
export function replyToFacebookComment(tenant, commentId, message) {
  return graphPost(
    `${commentId}/comments`,
    { message },
    tenant.meta.pageAccessToken
  );
}
