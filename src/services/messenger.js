import { config } from "../config.js";
import { graphPost } from "../graph.js";

/** Facebook Messenger orqali xabar yuboradi. */
export function sendMessengerMessage(psid, text) {
  return graphPost(
    "me/messages",
    {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text },
    },
    config.pageAccessToken
  );
}

/** Facebook post kommentiga javob yozadi. */
export function replyToFacebookComment(commentId, message) {
  return graphPost(`${commentId}/comments`, { message }, config.pageAccessToken);
}
