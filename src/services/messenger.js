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

/** Facebook post kommentiga javob yozadi. */
export function replyToFacebookComment(tenant, commentId, message) {
  return graphPost(
    `${commentId}/comments`,
    { message },
    tenant.meta.pageAccessToken
  );
}
