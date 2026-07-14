import { graphUrl } from "./config.js";

/**
 * Meta Graph API'ga POST so'rov yuboradi.
 * Xatolik bo'lsa javob tanasini log qiladi va null qaytaradi —
 * bitta xabar xato bo'lsa butun server yiqilmasligi kerak.
 */
export async function graphPost(path, body, accessToken) {
  const res = await fetch(graphUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Graph API xatosi [${path}]:`, JSON.stringify(data));
    return null;
  }
  return data;
}
