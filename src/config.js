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
};

export const graphUrl = (path) =>
  `https://graph.facebook.com/${config.graphApiVersion}/${path}`;
