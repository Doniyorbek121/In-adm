import { commentReplyText } from "../autoReply.js";
import { processMessage } from "../respond.js";
import { isActive } from "../subscription.js";
import { isDuplicate } from "../dedup.js";
import { loadAttachments } from "./instagram.js";
import {
  sendMessengerMessage,
  replyToFacebookComment,
  showTyping,
} from "../services/messenger.js";

/** Facebook sahifa webhook (object: "page") hodisalarini qayta ishlaydi. */
export async function handleFacebookEntry(tenant, entry) {
  const pageId = entry.id;

  // Messenger xabarlari — matn, ovoz, rasm, video
  for (const event of entry.messaging || []) {
    const senderId = event.sender?.id;
    const message = event.message;
    if (!senderId || !message || message.is_echo) continue;
    if (senderId === pageId) continue;
    if (isDuplicate(message.mid)) continue;

    const text = message.text || "";
    const media = await loadAttachments(message.attachments);
    if (!text && media.length === 0) continue;

    console.log(
      `[Messenger] ${tenant.businessName}: ${senderId} -> "${text}" (${media.length} media)`
    );
    await showTyping(tenant, senderId);
    const { reply } = await processMessage(tenant, "facebook", senderId, { text, media });
    if (reply) await sendMessengerMessage(tenant, senderId, reply);
  }

  // Sahifa postlaridagi kommentlar (feed)
  for (const change of entry.changes || []) {
    if (change.field !== "feed") continue;
    const value = change.value;
    if (value?.item !== "comment" || value?.verb !== "add") continue;
    if (value.from?.id === pageId) continue;
    if (isDuplicate(`c:${value.comment_id}`)) continue;
    if (!isActive(tenant)) continue; // obuna faol emas

    console.log(
      `[FB Komment] ${tenant.businessName}: ${value.from?.name || "?"}: "${value.message}"`
    );
    await replyToFacebookComment(tenant, value.comment_id, commentReplyText());
  }
}
