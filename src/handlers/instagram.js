import { commentReplyText, commentPrivateReplyText } from "../autoReply.js";
import { processMessage } from "../respond.js";
import { isActive } from "../subscription.js";
import { isDuplicate } from "../dedup.js";
import { fetchAsBase64 } from "../media.js";
import {
  replyToComment,
  privateReplyToComment,
  sendDirectMessage,
  showTyping,
} from "../services/instagram.js";

/** IG/Messenger xabaridagi biriktirmalarni (rasm/ovoz/video) yuklab oladi */
export async function loadAttachments(attachments = []) {
  const media = [];
  for (const att of attachments) {
    if (!["image", "video", "audio"].includes(att.type)) continue;
    const url = att.payload?.url;
    if (!url) continue;
    try {
      media.push(await fetchAsBase64(url));
    } catch (err) {
      console.error("Biriktirmani yuklab bo'lmadi:", err.message);
    }
  }
  return media;
}

/** Instagram webhook (object: "instagram") hodisalarini qayta ishlaydi. */
export async function handleInstagramEntry(tenant, entry) {
  // Direct (DM) xabarlar — matn, ovoz, rasm, video
  for (const event of entry.messaging || []) {
    const senderId = event.sender?.id;
    const message = event.message;
    if (!senderId || !message || message.is_echo) continue;
    if (senderId === tenant.meta.igUserId) continue;
    if (isDuplicate(message.mid)) continue; // takroriy webhook

    const text = message.text || "";
    const media = await loadAttachments(message.attachments);
    if (!text && media.length === 0) continue;

    console.log(
      `[IG Direct] ${tenant.businessName}: ${senderId} -> "${text}" (${media.length} media)`
    );
    await showTyping(tenant, senderId);
    const { reply } = await processMessage(tenant, "instagram", senderId, { text, media });
    if (reply) await sendDirectMessage(tenant, senderId, reply);
  }

  // Kommentlar
  for (const change of entry.changes || []) {
    if (change.field !== "comments") continue;
    const comment = change.value;
    if (!comment?.id) continue;
    if (comment.from?.id === tenant.meta.igUserId) continue;
    if (isDuplicate(`c:${comment.id}`)) continue;
    if (!isActive(tenant)) continue; // obuna faol emas — javob yo'q

    console.log(
      `[IG Komment] ${tenant.businessName}: @${comment.from?.username || "?"}: "${comment.text}"`
    );
    await replyToComment(tenant, comment.id, commentReplyText());

    // Direct'ga AI bilan shaxsiy javob — komment mazmuniga mos
    const { reply } = comment.text
      ? await processMessage(tenant, "instagram", `comment:${comment.from?.id || comment.id}`, {
          text: comment.text,
        })
      : { reply: commentPrivateReplyText() };
    if (reply) await privateReplyToComment(tenant, comment.id, reply);
  }
}
