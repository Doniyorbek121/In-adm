import { config } from "../config.js";
import { commentReplyText, commentPrivateReplyText } from "../autoReply.js";
import { generateReply } from "../ai.js";
import {
  replyToComment,
  privateReplyToComment,
  sendDirectMessage,
} from "../services/instagram.js";

/** Instagram webhook (object: "instagram") hodisalarini qayta ishlaydi. */
export async function handleInstagramEntry(entry) {
  // Direct (DM) xabarlar
  for (const event of entry.messaging || []) {
    const senderId = event.sender?.id;
    const text = event.message?.text;

    // O'zimiz yuborgan xabarlar (echo) va bo'sh xabarlarni tashlab yuboramiz
    if (!senderId || !text || event.message?.is_echo) continue;
    if (senderId === config.igUserId) continue;

    const reply = await generateReply(senderId, text);
    console.log(`[IG Direct] ${senderId}: "${text}" -> javob yuborilmoqda`);
    await sendDirectMessage(senderId, reply);
  }

  // Kommentlar
  for (const change of entry.changes || []) {
    if (change.field !== "comments") continue;
    const comment = change.value;
    if (!comment?.id) continue;

    // O'zimizning kommentimizga javob bermaymiz (cheksiz sikl oldini olish)
    if (comment.from?.id === config.igUserId) continue;

    console.log(
      `[IG Komment] @${comment.from?.username || "?"}: "${comment.text}" -> javob yuborilmoqda`
    );
    await replyToComment(comment.id, commentReplyText());
    await privateReplyToComment(comment.id, commentPrivateReplyText());
  }
}
