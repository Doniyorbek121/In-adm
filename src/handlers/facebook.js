import { commentReplyText } from "../autoReply.js";
import { generateReply } from "../ai.js";
import {
  sendMessengerMessage,
  replyToFacebookComment,
} from "../services/messenger.js";

/** Facebook sahifa webhook (object: "page") hodisalarini qayta ishlaydi. */
export async function handleFacebookEntry(entry) {
  const pageId = entry.id;

  // Messenger xabarlari
  for (const event of entry.messaging || []) {
    const senderId = event.sender?.id;
    const text = event.message?.text;

    if (!senderId || !text || event.message?.is_echo) continue;
    if (senderId === pageId) continue;

    const reply = await generateReply(senderId, text);
    console.log(`[Messenger] ${senderId}: "${text}" -> javob yuborilmoqda`);
    await sendMessengerMessage(senderId, reply);
  }

  // Sahifa postlaridagi kommentlar (feed)
  for (const change of entry.changes || []) {
    if (change.field !== "feed") continue;
    const value = change.value;
    if (value?.item !== "comment" || value?.verb !== "add") continue;

    // Sahifaning o'z kommentlariga javob bermaymiz
    if (value.from?.id === pageId) continue;

    console.log(
      `[FB Komment] ${value.from?.name || "?"}: "${value.message}" -> javob yuborilmoqda`
    );
    await replyToFacebookComment(value.comment_id, commentReplyText());
  }
}
