import { graphPost } from "../graph.js";

/** Instagram kommentiga ochiq (public) javob yozadi. */
export function replyToComment(tenant, commentId, message) {
  return graphPost(`${commentId}/replies`, { message }, tenant.meta.pageAccessToken);
}

/**
 * Komment egasiga Direct'ga shaxsiy javob (Private Reply) yuboradi.
 * Meta qoidasi: faqat komment yozilganidan keyin 7 kun ichida mumkin.
 */
export function privateReplyToComment(tenant, commentId, text) {
  return graphPost(
    "me/messages",
    {
      recipient: { comment_id: commentId },
      message: { text },
    },
    tenant.meta.pageAccessToken
  );
}

/** Instagram Direct (DM) xabariga javob yuboradi. */
export function sendDirectMessage(tenant, igsid, text) {
  return graphPost(
    "me/messages",
    {
      recipient: { id: igsid },
      message: { text },
    },
    tenant.meta.pageAccessToken
  );
}

/** "Yozmoqda…" ko'rsatkichi va o'qildi belgisi (tirik operator taassuroti). */
export function showTyping(tenant, igsid) {
  return graphPost(
    "me/messages",
    { recipient: { id: igsid }, sender_action: "typing_on" },
    tenant.meta.pageAccessToken
  );
}
