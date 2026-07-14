import { graphUrl } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Meta Graph API'ga POST so'rov yuboradi. Tarmoq/server xatosida
 * eksponensial kutish bilan qayta uriniladi (2s, 4s). Xato bo'lsa null.
 * Bitta xabar xato bo'lsa butun server yiqilmasligi kerak.
 */
export async function graphPost(path, body, accessToken, { retries = 2 } = {}) {
  if (!accessToken) {
    console.error(`Graph API [${path}]: access token yo'q — o'tkazib yuborildi`);
    return null;
  }

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(graphUrl(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Tarmoq xatosi — qayta urinamiz
      if (attempt < retries) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      console.error(`Graph API [${path}] tarmoq xatosi:`, err.message);
      return null;
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;

    // 5xx — vaqtinchalik, qayta urinamiz; 4xx — qayta urinishning foydasi yo'q
    if (res.status >= 500 && attempt < retries) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    console.error(`Graph API xatosi [${path}] (${res.status}):`, JSON.stringify(data).slice(0, 300));
    return null;
  }
}
