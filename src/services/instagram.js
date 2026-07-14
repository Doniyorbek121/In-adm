import { config } from "../config.js";
import { graphPost } from "../graph.js";

/** Instagram kommentiga ochiq (public) javob yozadi. */
export function replyToComment(commentId, message) {
  return graphPost(`${commentId}/replies`, { message }, config.pageAccessToken);
}

/**
 * Komment egasiga Direct'ga shaxsiy javob (Private Reply) yuboradi.
 * Meta qoidasi: faqat komment yozilganidan keyin 7 kun ichida mumkin.
 */
export function privateReplyToComment(commentId, text) {
  return graphPost(
    "me/messages",
    {
      recipient: { comment_id: commentId },
      message: { text },
    },
    config.pageAccessToken
  );
}

/** Instagram Direct (DM) xabariga javob yuboradi. */
export function sendDirectMessage(igsid, text) {
  return graphPost(
    "me/messages",
    {
      recipient: { id: igsid },
      message: { text },
    },
    config.pageAccessToken
  );
}
