import express from "express";
import crypto from "node:crypto";
import { config } from "./config.js";
import { attachUser } from "./auth.js";
import { web } from "./web/routes.js";
import { page } from "./web/layout.js";
import { findUserByPlatformId, persist } from "./db.js";
import { handleInstagramEntry } from "./handlers/instagram.js";
import { handleFacebookEntry } from "./handlers/facebook.js";
import { handleWhatsAppEntry } from "./handlers/whatsapp.js";

const app = express();

// Imzo tekshiruvi uchun so'rovning xom (raw) tanasini saqlab qo'yamiz
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(attachUser);

// Veb admin-panel (ro'yxat, kirish, sozlamalar)
app.use(web);

/** Meta yuborgan X-Hub-Signature-256 imzosini tekshiradi. */
function isValidSignature(req) {
  if (!config.appSecret) return true; // APP_SECRET berilmagan bo'lsa tekshirmaymiz
  const signature = req.get("x-hub-signature-256");
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", config.appSecret)
      .update(req.rawBody)
      .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// Server tirikligini tekshirish (monitoring/uptime uchun)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Webhook tekshiruvi (Meta Developer panelda "Verify" bosilganda keladi)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {
    console.log("Webhook muvaffaqiyatli tasdiqlandi ✅");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * Kiruvchi hodisa qaysi biznesga (foydalanuvchiga) tegishli ekanini aniqlaydi.
 * Instagram: entry.id = IG akkaunt ID; Page: entry.id = sahifa ID;
 * WhatsApp: metadata.phone_number_id.
 */
function resolveTenant(object, entry) {
  if (object === "instagram") return findUserByPlatformId("ig", entry.id);
  if (object === "page") return findUserByPlatformId("page", entry.id);
  if (object === "whatsapp_business_account") {
    const phoneId = entry.changes?.[0]?.value?.metadata?.phone_number_id;
    return findUserByPlatformId("whatsapp", phoneId);
  }
  return null;
}

// Barcha platformalardan keladigan hodisalar shu yerga tushadi
app.post("/webhook", (req, res) => {
  if (!isValidSignature(req)) {
    console.warn("Noto'g'ri webhook imzosi — so'rov rad etildi");
    return res.sendStatus(403);
  }

  // Meta 20 soniya ichida 200 kutadi — avval javob beramiz, keyin ishlaymiz
  res.sendStatus(200);

  const { object, entry = [] } = req.body || {};
  for (const item of entry) {
    const tenant = resolveTenant(object, item);
    if (!tenant) {
      console.log(
        `Hodisa uchun biznes topilmadi (${object}, id: ${item.id}) — panelda ID'lar to'g'ri kiritilganini tekshiring`
      );
      continue;
    }

    const process =
      object === "instagram"
        ? handleInstagramEntry(tenant, item)
        : object === "page"
          ? handleFacebookEntry(tenant, item)
          : handleWhatsAppEntry(tenant, item);

    process.catch((err) => console.error("Hodisani qayta ishlashda xato:", err));
  }
});

// Topilmagan sahifalar
app.use((req, res) => {
  if (req.accepts("html")) {
    return res
      .status(404)
      .send(
        page(
          "Topilmadi",
          `<div class="card center">
            <h1>404</h1>
            <p>Bunday sahifa topilmadi.</p>
            <p><a href="/">← Bosh sahifa</a></p>
          </div>`,
          { user: req.user }
        )
      );
  }
  res.sendStatus(404);
});

// Ishga tushishdan oldin muhim sozlamalarni tekshiramiz
function checkConfig() {
  const warn = [];
  if (!config.verifyToken) warn.push("VERIFY_TOKEN o'rnatilmagan — webhook tasdiqlanmaydi");
  if (!config.appSecret) warn.push("APP_SECRET yo'q — webhook imzosi tekshirilmaydi (xavfsizlik uchun tavsiya etiladi)");
  if (!config.adminEmails.length) warn.push("ADMIN_EMAILS yo'q — hech kim admin panelga kira olmaydi");
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY)
    warn.push("AI kaliti (GEMINI_API_KEY) yo'q — bot kalit so'z rejimida ishlaydi");
  if (!config.fbAppId || !config.baseUrl)
    warn.push("FB_APP_ID/BASE_URL yo'q — 'Facebook bilan ulash' o'chiq (tokenlar admin panelda qo'lda kiritiladi)");
  for (const w of warn) console.warn("⚠️  " + w);
}

const server = app.listen(config.port, () => {
  checkConfig();
  console.log(`Server ${config.port}-portda ishga tushdi 🚀`);
  console.log(`Admin panel:    http://localhost:${config.port}/`);
  console.log(`Webhook manzil: http://localhost:${config.port}/webhook`);
});

// Server to'xtatilganda bazani saqlab, tozalab chiqamiz
function shutdown(signal) {
  console.log(`\n${signal} — bazani saqlab, to'xtatilmoqda...`);
  try {
    persist();
  } catch (err) {
    console.error("Saqlashda xato:", err.message);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
