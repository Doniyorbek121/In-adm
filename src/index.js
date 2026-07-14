import express from "express";
import crypto from "node:crypto";
import { config } from "./config.js";
import { attachUser } from "./auth.js";
import { web } from "./web/routes.js";
import { findUserByPlatformId } from "./db.js";
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

app.listen(config.port, () => {
  console.log(`Server ${config.port}-portda ishga tushdi 🚀`);
  console.log(`Admin panel:    http://localhost:${config.port}/`);
  console.log(`Webhook manzil: http://localhost:${config.port}/webhook`);
});
