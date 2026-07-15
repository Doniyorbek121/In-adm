import { config, OAUTH_SCOPES } from "./config.js";
import { graphGet, graphPost } from "./graph.js";

// "Facebook bilan ulash" sozlanganmi? (App ID, App Secret, tashqi manzil)
export const oauthAvailable = Boolean(
  config.fbAppId && config.appSecret && config.baseUrl
);

export const redirectUri = `${config.baseUrl}/connect/facebook/callback`;

// Instagram + Messenger webhooklariga sahifani ulash uchun maydonlar
const SUBSCRIBE_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_reactions",
  "feed",
].join(",");

/** Foydalanuvchini Facebook ruxsat oynasiga yo'naltirish uchun URL */
export function authUrl(state) {
  const params = new URLSearchParams({
    client_id: config.fbAppId,
    redirect_uri: redirectUri,
    state,
    scope: OAUTH_SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/${config.graphApiVersion}/dialog/oauth?${params}`;
}

/** OAuth code'ni qisqa muddatli user token'ga almashtiradi */
async function exchangeCode(code) {
  const data = await graphGet("oauth/access_token", {
    client_id: config.fbAppId,
    client_secret: config.appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return data.error ? null : data.access_token;
}

/** Qisqa muddatli tokenni uzoq muddatli (~60 kun) tokenga almashtiradi */
async function toLongLived(shortToken) {
  const data = await graphGet("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: config.fbAppId,
    client_secret: config.appSecret,
    fb_exchange_token: shortToken,
  });
  return data.error ? shortToken : data.access_token || shortToken;
}

/**
 * OAuth code'dan foydalanuvchining Facebook sahifalari ro'yxatini oladi.
 * Har biri: { id, name, access_token, igUserId, igUsername }.
 */
export async function fetchPages(code) {
  const shortToken = await exchangeCode(code);
  if (!shortToken) return { error: "Facebook token olinmadi" };
  const userToken = await toLongLived(shortToken);

  const acc = await graphGet("me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token,instagram_business_account{id,username}",
    limit: "50",
  });
  if (acc.error) return { error: "Facebook sahifalari olinmadi" };

  const pages = (acc.data || []).map((p) => ({
    id: p.id,
    name: p.name,
    access_token: p.access_token,
    igUserId: p.instagram_business_account?.id || "",
    igUsername: p.instagram_business_account?.username || "",
  }));
  return { pages };
}

/**
 * Sahifani ilova webhooklariga ulaydi — shundan so'ng xabar/kommentlar
 * bizning serverga kela boshlaydi.
 */
export function subscribePage(page) {
  return graphPost(
    `${page.id}/subscribed_apps`,
    { subscribed_fields: SUBSCRIBE_FIELDS },
    page.access_token
  );
}
