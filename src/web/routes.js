import { Router } from "express";
import { register, login, logout, parseSid, requireAuth } from "../auth.js";
import { updateUser } from "../db.js";
import { config } from "../config.js";
import { page, esc } from "./layout.js";

export const web = Router();

const cookieOpts = "HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000";

// ==== Bosh sahifa ====

web.get("/", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(
    page(
      "Bosh sahifa",
      `<div class="card">
        <h1>Biznesingizni AI'ga topshiring 🤖</h1>
        <p>Instagram, WhatsApp va Facebook'da mijozlaringizga 24/7 avtomatik javob beruvchi aqlli yordamchi:</p>
        <ul>
          <li>✍️ Matnli xabarlarga xuddi tirik operator kabi javob beradi</li>
          <li>🎤 Ovozli xabarlarni eshitib tushunadi</li>
          <li>📸 Rasm va videolarni ko'rib tahlil qiladi</li>
          <li>🧠 Siz o'rgatgan biznes ma'lumotlari asosida ishlaydi</li>
          <li>💬 Instagram Direct, kommentlar, WhatsApp, Messenger — barchasi bitta joyda</li>
        </ul>
        <p><a href="/register"><button>Bepul boshlash</button></a></p>
      </div>`,
      { user: req.user }
    )
  );
});

// ==== Ro'yxatdan o'tish ====

web.get("/register", (req, res) => {
  res.send(registerPage());
});

web.post("/register", (req, res) => {
  const { email, password, businessName } = req.body || {};
  const result = register(email, password, businessName);
  if (result.error) return res.send(registerPage(result.error, req.body));
  const { token } = login(email, password);
  res.setHeader("Set-Cookie", `sid=${token}; ${cookieOpts}`);
  res.redirect("/dashboard");
});

function registerPage(error = "", values = {}) {
  return page(
    "Ro'yxatdan o'tish",
    `<div class="card center">
      <h1>Ro'yxatdan o'tish</h1>
      ${error ? `<div class="error">${esc(error)}</div>` : ""}
      <form method="post" action="/register">
        <label>Biznes nomi</label>
        <input name="businessName" required value="${esc(values.businessName || "")}" placeholder="Masalan: Guli Do'koni">
        <label>Email</label>
        <input name="email" type="email" required value="${esc(values.email || "")}">
        <label>Parol (kamida 6 belgi)</label>
        <input name="password" type="password" required minlength="6">
        <button>Ro'yxatdan o'tish</button>
      </form>
      <p class="hint">Hisobingiz bormi? <a href="/login">Kirish</a></p>
    </div>`
  );
}

// ==== Kirish / chiqish ====

web.get("/login", (_req, res) => {
  res.send(loginPage());
});

web.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const result = login(email, password);
  if (result.error) return res.send(loginPage(result.error, email));
  res.setHeader("Set-Cookie", `sid=${result.token}; ${cookieOpts}`);
  res.redirect("/dashboard");
});

function loginPage(error = "", email = "") {
  return page(
    "Kirish",
    `<div class="card center">
      <h1>Kirish</h1>
      ${error ? `<div class="error">${esc(error)}</div>` : ""}
      <form method="post" action="/login">
        <label>Email</label>
        <input name="email" type="email" required value="${esc(email)}">
        <label>Parol</label>
        <input name="password" type="password" required>
        <button>Kirish</button>
      </form>
      <p class="hint">Hisobingiz yo'qmi? <a href="/register">Ro'yxatdan o'tish</a></p>
    </div>`
  );
}

web.get("/logout", (req, res) => {
  logout(parseSid(req));
  res.setHeader("Set-Cookie", "sid=; Path=/; Max-Age=0");
  res.redirect("/login");
});

// ==== Boshqaruv paneli ====

web.get("/dashboard", requireAuth, (req, res) => {
  const u = req.user;
  const saved = req.query.saved;
  const badge = (on) =>
    on ? `<span class="badge on">ulangan</span>` : `<span class="badge off">ulanmagan</span>`;

  res.send(
    page(
      "Boshqaruv",
      `${saved ? `<div class="ok">Saqlandi ✅</div>` : ""}

      <div class="card">
        <h1>${esc(u.businessName || "Biznesim")}</h1>
        <p class="hint">
          AI o'qitish ${badge(Boolean(u.businessInfo))} &nbsp;
          AI kalit ${badge(Boolean(u.geminiApiKey || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY))} &nbsp;
          Instagram/Facebook ${badge(Boolean(u.meta.pageAccessToken))} &nbsp;
          WhatsApp ${badge(Boolean(u.meta.whatsappToken))}
        </p>
      </div>

      <div class="card">
        <h2>🧠 AI'ni biznesingizga o'rgatish</h2>
        <p class="hint">Biznesingiz haqida hamma narsani yozing: mahsulotlar, narxlar, manzil,
        ish vaqti, yetkazib berish, to'lov usullari, chegirmalar, tez-tez so'raladigan savollar.
        AI mijozlarga aynan shu ma'lumot asosida javob beradi — qancha to'liq yozsangiz, shuncha aqlli bo'ladi.</p>
        <form method="post" action="/settings/business">
          <label>Biznes nomi</label>
          <input name="businessName" value="${esc(u.businessName)}">
          <label>Biznes ma'lumotlari</label>
          <textarea name="businessInfo" placeholder="Masalan:
Biz ayollar kiyimlari do'konimiz. 2018-yildan beri ishlaymiz.
Manzil: Toshkent, Chilonzor 9-kvartal. Ish vaqti: 9:00-20:00.
Narxlar: libos 200-500 ming, ko'ylak 150-300 ming...
Yetkazib berish: Toshkent bo'ylab 1 kunda, 20 ming so'm...">${esc(u.businessInfo)}</textarea>
          <button>Saqlash</button>
        </form>
      </div>

      <div class="card">
        <h2>🔑 AI kaliti (Gemini)</h2>
        <p class="hint"><a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>
        dan bepul kalit oling. Ovozli xabar, rasm va video tahlili uchun shu kerak.
        ${process.env.GEMINI_API_KEY ? "Platformada umumiy kalit sozlangan — o'zingizniki bo'lsa, u ustun bo'ladi." : ""}</p>
        <form method="post" action="/settings/ai">
          <label>Gemini API kaliti</label>
          <input name="geminiApiKey" value="${esc(u.geminiApiKey)}" placeholder="AIza...">
          <button>Saqlash</button>
        </form>
      </div>

      <div class="card">
        <h2>📱 Instagram va Facebook ulash</h2>
        <p class="hint"><a href="https://developers.facebook.com" target="_blank">developers.facebook.com</a> da App yaratib,
        Instagram Business akkauntingizni Facebook sahifangizga ulang, so'ng quyidagilarni kiriting.</p>
        <form method="post" action="/settings/meta">
          <label>Page Access Token</label>
          <input name="pageAccessToken" value="${esc(u.meta.pageAccessToken)}" placeholder="EAAG...">
          <label>Facebook Page ID</label>
          <input name="pageId" value="${esc(u.meta.pageId)}" placeholder="1234567890">
          <label>Instagram Business akkaunt ID</label>
          <input name="igUserId" value="${esc(u.meta.igUserId)}" placeholder="17841400000000000">
          <h2 style="margin-top:22px">💚 WhatsApp ulash</h2>
          <label>WhatsApp Token</label>
          <input name="whatsappToken" value="${esc(u.meta.whatsappToken)}" placeholder="EAAG...">
          <label>WhatsApp Phone Number ID</label>
          <input name="whatsappPhoneNumberId" value="${esc(u.meta.whatsappPhoneNumberId)}" placeholder="123456789012345">
          <button>Saqlash</button>
        </form>
      </div>

      <div class="card">
        <h2>🔗 Webhook sozlamalari (Meta panel uchun)</h2>
        <p class="hint">Meta Developer panelda Webhooks bo'limiga quyidagilarni kiriting:</p>
        <p>Callback URL: <code>https://SIZNING-DOMENINGIZ/webhook</code><br>
        Verify Token: <code>${esc(config.verifyToken || "(.env da VERIFY_TOKEN kiriting)")}</code></p>
        <p class="hint">Obunalar: Instagram — <code>messages</code>, <code>comments</code>;
        Page — <code>messages</code>, <code>feed</code>;
        WhatsApp — <code>messages</code>.</p>
      </div>`,
      { user: u }
    )
  );
});

// ==== Sozlamalarni saqlash ====

web.post("/settings/business", requireAuth, (req, res) => {
  updateUser(req.user.id, {
    businessName: String(req.body.businessName || "").slice(0, 200),
    businessInfo: String(req.body.businessInfo || "").slice(0, 50000),
  });
  res.redirect("/dashboard?saved=1");
});

web.post("/settings/ai", requireAuth, (req, res) => {
  updateUser(req.user.id, {
    geminiApiKey: String(req.body.geminiApiKey || "").trim(),
  });
  res.redirect("/dashboard?saved=1");
});

web.post("/settings/meta", requireAuth, (req, res) => {
  updateUser(req.user.id, {
    meta: {
      pageAccessToken: String(req.body.pageAccessToken || "").trim(),
      pageId: String(req.body.pageId || "").trim(),
      igUserId: String(req.body.igUserId || "").trim(),
      whatsappToken: String(req.body.whatsappToken || "").trim(),
      whatsappPhoneNumberId: String(req.body.whatsappPhoneNumberId || "").trim(),
    },
  });
  res.redirect("/dashboard?saved=1");
});
