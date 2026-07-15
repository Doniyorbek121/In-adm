import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  verifyToken: process.env.VERIFY_TOKEN || "",
  appSecret: process.env.APP_SECRET || "",
  graphApiVersion: process.env.GRAPH_API_VERSION || "v21.0",
  // Admin (dasturchi) email'i — bu foydalanuvchi barcha bizneslarning
  // Meta tokenlarini boshqara oladi. Vergul bilan bir nechta bo'lishi mumkin.
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean),
  // Facebook OAuth ("Facebook bilan ulash") uchun
  fbAppId: process.env.FB_APP_ID || "",
  // OAuth redirect uchun tashqi manzil, masalan: https://bot.example.uz
  baseUrl: (process.env.BASE_URL || "").replace(/\/$/, ""),
};

// "Facebook bilan ulash" uchun so'raladigan ruxsatlar
export const OAUTH_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "business_management",
].join(",");

export const graphUrl = (path) =>
  `https://graph.facebook.com/${config.graphApiVersion}/${path}`;
