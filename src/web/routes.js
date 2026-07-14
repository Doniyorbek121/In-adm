import { Router } from "express";
import {
  register,
  login,
  logout,
  parseSid,
  requireAuth,
  requireAdmin,
  isAdmin,
} from "../auth.js";
import { updateUser, listUsers, findUserById, persist } from "../db.js";
import { config } from "../config.js";
import { PLANS, statusInfo, activate, deactivate } from "../subscription.js";
import {
  statsSummary,
  pendingHandoffs,
  resolveHandoff,
} from "../engagement.js";
import { ttsAvailable } from "../tts.js";
import { page, esc } from "./layout.js";

export const web = Router();

const cookieOpts = "HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000";

// Platformada AI kaliti sozlanganmi? (dasturchi .env orqali kiritadi)
const platformAiReady = Boolean(
  process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY
);

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
        <p class="hint">Texnik sozlash (AI kaliti, ijtimoiy tarmoqlarni ulash) biz tomonimizdan bajariladi.
        Siz faqat ro'yxatdan o'tib, biznesingizni AI'ga o'rgatasiz.</p>
        <p><a href="/register"><button>Bepul boshlash</button></a></p>
      </div>`,
      { user: req.user }
    )
  );
});

// ==== Ro'yxatdan o'tish ====

web.get("/register", (_req, res) => res.send(registerPage()));

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

web.get("/login", (_req, res) => res.send(loginPage()));

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

// ==== Tadbirkor boshqaruv paneli — faqat AI o'qitish ====

const badge = (on) =>
  on ? `<span class="badge on">ulangan</span>` : `<span class="badge off">kutilmoqda</span>`;

web.get("/dashboard", requireAuth, (req, res) => {
  const u = req.user;
  const admin = isAdmin(u);
  const saved = req.query.saved;
  const channelsReady = Boolean(u.meta.pageAccessToken || u.meta.whatsappToken);
  const sub = statusInfo(u);
  const stats = statsSummary(u);
  const pending = pendingHandoffs(u);

  // Obuna banneri
  const subBanner = sub.active
    ? `<div class="ok">${esc(sub.label)}${sub.until ? ` — ${sub.until.toLocaleDateString("uz")}gача` : ""}. <a href="/billing">Obunani boshqarish</a></div>`
    : `<div class="error">${esc(sub.label)}. Bot to'xtatilgan — davom ettirish uchun <a href="/billing">obunani to'lang</a>.</div>`;

  // Statistika grafigi (oddiy ustunlar)
  const maxDay = Math.max(1, ...stats.last7.map((d) => d.count));
  const bars = stats.last7
    .map(
      (d) =>
        `<div style="flex:1;text-align:center">
          <div style="height:60px;display:flex;align-items:flex-end;justify-content:center">
            <div title="${d.count}" style="width:60%;background:var(--brand);border-radius:4px 4px 0 0;height:${Math.round((d.count / maxDay) * 100)}%;min-height:2px"></div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">${esc(d.day)}</div>
        </div>`
    )
    .join("");

  const handoffList = pending.length
    ? pending
        .map(
          (h) =>
            `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee">
              <span>👤 <b>${esc(h.channel)}</b> — ${esc(h.chatKey)} <span style="color:var(--muted);font-size:12px">(${new Date(h.at).toLocaleString("uz")})</span></span>
              <form method="post" action="/handoff/resolve" style="margin:0">
                <input type="hidden" name="id" value="${esc(h.id)}">
                <button style="margin:0;padding:6px 12px;font-size:13px">Hal qilindi</button>
              </form>
            </div>`
        )
        .join("")
    : `<p class="hint">Kutayotgan murojaat yo'q ✨</p>`;

  res.send(
    page(
      "Boshqaruv",
      `${saved ? `<div class="ok">Saqlandi ✅</div>` : ""}
      ${subBanner}

      <div class="card">
        <h1>${esc(u.businessName || "Biznesim")}</h1>
        <p class="hint">
          AI o'qitish ${badge(Boolean(u.businessInfo))} &nbsp;
          AI xizmati ${badge(platformAiReady || Boolean(u.geminiApiKey))} &nbsp;
          Ijtimoiy tarmoqlar ${badge(channelsReady)}
        </p>
        <p><a href="/billing">💳 Obuna</a>${admin ? ` &nbsp;·&nbsp; <a href="/admin">⚙️ Admin panel</a>` : ""}</p>
      </div>

      <div class="card">
        <h2>📊 Statistika</h2>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px">
          <div><div style="font-size:26px;font-weight:700">${stats.messages}</div><div class="hint">Jami xabar</div></div>
          <div><div style="font-size:26px;font-weight:700">${stats.customers}</div><div class="hint">Mijozlar</div></div>
          <div><div style="font-size:26px;font-weight:700">${stats.orders}</div><div class="hint">Buyurtma so'rovi</div></div>
        </div>
        <div style="display:flex;gap:4px;margin-top:8px">${bars}</div>
        <p class="hint" style="margin-top:10px">Kanallar: Instagram ${stats.channels.instagram} · Facebook ${stats.channels.facebook} · WhatsApp ${stats.channels.whatsapp}</p>
      </div>

      <div class="card">
        <h2>👤 Operator chaqiruvlari</h2>
        <p class="hint">Mijoz "operator" yoki "odam bilan gaplashaman" desa, bot 2 soatga jim bo'ladi
        va bu yerda ko'rinadi. Siz Instagram/WhatsApp ilovasidan javob berasiz. Tugagach "Hal qilindi" bosing.</p>
        ${handoffList}
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
        <h2>🎤 Ovozli javob</h2>
        <p class="hint">Yoqilsa, bot WhatsApp'da matn bilan birga ovozli javob ham yuboradi.
        ${ttsAvailable ? "" : "<b>Diqqat:</b> platformada ovoz xizmati hali sozlanmagan — administrator bilan bog'laning."}</p>
        <form method="post" action="/settings/voice">
          <label style="display:flex;align-items:center;gap:8px;font-weight:400">
            <input type="checkbox" name="voiceReplies" value="1" style="width:auto" ${u.settings?.voiceReplies ? "checked" : ""}>
            Ovozli javobni yoqish
          </label>
          <button>Saqlash</button>
        </form>
      </div>

      <div class="card">
        <h2>📱 Ijtimoiy tarmoqlar holati</h2>
        <p>
          Instagram / Facebook: ${badge(Boolean(u.meta.pageAccessToken))}<br>
          WhatsApp: ${badge(Boolean(u.meta.whatsappToken))}
        </p>
        <p class="hint">Ulanishni texnik jamoa sozlaydi — bizga murojaat qiling.</p>
      </div>`,
      { user: u }
    )
  );
});

web.post("/settings/voice", requireAuth, (req, res) => {
  req.user.settings ||= {};
  req.user.settings.voiceReplies = Boolean(req.body.voiceReplies);
  persist();
  res.redirect("/dashboard?saved=1");
});

web.post("/handoff/resolve", requireAuth, (req, res) => {
  resolveHandoff(req.user, String(req.body.id || ""));
  res.redirect("/dashboard");
});

// ==== Obuna / to'lov sahifasi ====

web.get("/billing", requireAuth, (req, res) => {
  const u = req.user;
  const sub = statusInfo(u);
  const planCards = Object.values(PLANS)
    .map(
      (p) => `<div class="card" style="border:2px solid ${u.subscription.plan === p.id ? "var(--brand)" : "#e5e7eb"}">
        <h2>${esc(p.name)} ${u.subscription.plan === p.id ? '<span class="badge on">joriy</span>' : ""}</h2>
        <p style="font-size:24px;font-weight:700;margin:4px 0">${p.price.toLocaleString("uz")} so'm<span style="font-size:14px;color:var(--muted);font-weight:400">/oy</span></p>
        <ul style="font-size:14px;color:#374151">${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      </div>`
    )
    .join("");

  res.send(
    page(
      "Obuna",
      `<div class="card">
        <h1>💳 Obuna</h1>
        <p>Holat: <b>${esc(sub.label)}</b>${sub.until ? ` (${sub.until.toLocaleDateString("uz")}gача)` : ""}</p>
        ${
          sub.active
            ? `<p class="hint">Obunangiz faol — bot ishlayapti.</p>`
            : `<div class="error">Obuna faol emas — bot to'xtatilgan.</div>`
        }
      </div>

      <h2 style="margin:0 0 8px">Tariflar</h2>
      ${planCards}

      <div class="card">
        <h2>To'lash</h2>
        <p class="hint">To'lovni amalga oshirish uchun quyidagi kartaga o'tkazing va chekni bizga yuboring —
        obunangizni faollashtiramiz:</p>
        <p><b>Karta:</b> <code>8600 0000 0000 0000</code> (Namuna MChJ)<br>
        <b>Telegram/telefon:</b> <code>+998 90 000 00 00</code></p>
        <p class="hint">Payme/Click orqali avtomatik to'lov tez orada qo'shiladi.</p>
      </div>`,
      { user: u }
    )
  );
});

web.post("/settings/business", requireAuth, (req, res) => {
  updateUser(req.user.id, {
    businessName: String(req.body.businessName || "").slice(0, 200),
    businessInfo: String(req.body.businessInfo || "").slice(0, 50000),
  });
  res.redirect("/dashboard?saved=1");
});

// ==== Admin panel (dasturchi) — barcha bizneslarni sozlash ====

web.get("/admin", requireAdmin, (req, res) => {
  const users = listUsers();
  const rows = users
    .map((u) => {
      const ch = Boolean(u.meta.pageAccessToken || u.meta.whatsappToken);
      const sub = statusInfo(u);
      return `<tr>
        <td>${esc(u.businessName || "-")}</td>
        <td>${esc(u.email)}</td>
        <td>${badge(Boolean(u.businessInfo))}</td>
        <td>${badge(ch)}</td>
        <td><span class="badge ${sub.active ? "on" : "off"}">${esc(sub.label)}</span></td>
        <td><a href="/admin/user/${u.id}">Sozlash →</a></td>
      </tr>`;
    })
    .join("");

  res.send(
    page(
      "Admin panel",
      `<div class="card">
        <h1>Admin panel</h1>
        <p class="hint">Barcha ro'yxatdan o'tgan bizneslar. Har biriga Meta tokenlarini
        siz kiritasiz — shundan so'ng ularning boti ishlay boshlaydi.
        AI kaliti butun platforma uchun <code>.env</code> da (<code>GEMINI_API_KEY</code>) sozlangan
        ${platformAiReady ? '<span class="badge on">tayyor</span>' : '<span class="badge off">sozlanmagan</span>'}.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="text-align:left;border-bottom:2px solid #e5e7eb">
            <th style="padding:8px 6px">Biznes</th><th>Email</th><th>AI o'qitilgan</th><th>Tarmoqlar</th><th>Obuna</th><th></th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="6" style="padding:12px">Hali biznes yo'q</td></tr>`}</tbody>
        </table>
      </div>`,
      { user: req.user }
    )
  );
});

web.get("/admin/user/:id", requireAdmin, (req, res) => {
  const u = findUserById(req.params.id);
  if (!u) return res.status(404).send("Biznes topilmadi");
  const saved = req.query.saved;

  res.send(
    page(
      "Biznesni sozlash",
      `${saved ? `<div class="ok">Saqlandi ✅</div>` : ""}
      <div class="card">
        <p><a href="/admin">← Barcha bizneslar</a></p>
        <h1>${esc(u.businessName || u.email)}</h1>
        <p class="hint">${esc(u.email)}</p>
      </div>

      <div class="card">
        <h2>📱 Instagram va Facebook</h2>
        <p class="hint">Bu biznesning Facebook sahifasi va Instagram Business akkaunti ma'lumotlari.</p>
        <form method="post" action="/admin/user/${u.id}/meta">
          <label>Page Access Token</label>
          <input name="pageAccessToken" value="${esc(u.meta.pageAccessToken)}" placeholder="EAAG...">
          <label>Facebook Page ID</label>
          <input name="pageId" value="${esc(u.meta.pageId)}" placeholder="1234567890">
          <label>Instagram Business akkaunt ID</label>
          <input name="igUserId" value="${esc(u.meta.igUserId)}" placeholder="17841400000000000">

          <h2 style="margin-top:22px">💚 WhatsApp</h2>
          <label>WhatsApp Token</label>
          <input name="whatsappToken" value="${esc(u.meta.whatsappToken)}" placeholder="EAAG...">
          <label>WhatsApp Phone Number ID</label>
          <input name="whatsappPhoneNumberId" value="${esc(u.meta.whatsappPhoneNumberId)}" placeholder="123456789012345">

          <h2 style="margin-top:22px">🔑 AI kaliti (ixtiyoriy)</h2>
          <p class="hint">Bo'sh qoldirsangiz platformaning umumiy kaliti ishlatiladi.
          Bu biznes uchun alohida Gemini kaliti kerak bo'lsagina to'ldiring.</p>
          <label>Gemini API kaliti</label>
          <input name="geminiApiKey" value="${esc(u.geminiApiKey)}" placeholder="AIza...">

          <button>Saqlash</button>
        </form>
      </div>

      <div class="card">
        <h2>💳 Obuna (to'lovni tasdiqlash)</h2>
        <p>Holat: <b>${esc(statusInfo(u).label)}</b>${u.subscription.expiresAt ? ` (${new Date(u.subscription.expiresAt).toLocaleDateString("uz")}gача)` : ""} · Tarif: ${esc(u.subscription.plan)}</p>
        <form method="post" action="/admin/user/${u.id}/subscription" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
          <div><label>Tarif</label>
            <select name="plan" style="padding:10px 12px;border:1px solid #d1d5db;border-radius:8px">
              ${Object.values(PLANS).map((p) => `<option value="${p.id}" ${u.subscription.plan === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
            </select></div>
          <button name="action" value="30" style="margin:0">+30 kun</button>
          <button name="action" value="365" style="margin:0">+365 kun</button>
          <button name="action" value="off" style="margin:0;background:#dc2626">Bekor qilish</button>
        </form>
      </div>

      <div class="card">
        <h2>🔗 Webhook (Meta panel uchun)</h2>
        <p>Callback URL: <code>https://SIZNING-DOMEN/webhook</code><br>
        Verify Token: <code>${esc(config.verifyToken || "(.env da VERIFY_TOKEN)")}</code></p>
        <p class="hint">Obunalar: Instagram — <code>messages</code>, <code>comments</code>;
        Page — <code>messages</code>, <code>feed</code>; WhatsApp — <code>messages</code>.</p>
      </div>`,
      { user: req.user }
    )
  );
});

web.post("/admin/user/:id/subscription", requireAdmin, (req, res) => {
  const u = findUserById(req.params.id);
  if (!u) return res.status(404).send("Biznes topilmadi");
  const action = String(req.body.action || "");
  const plan = String(req.body.plan || "");
  if (action === "off") {
    deactivate(u);
  } else {
    const days = Number(action);
    if (days > 0) activate(u, days, plan);
  }
  res.redirect(`/admin/user/${u.id}?saved=1`);
});

web.post("/admin/user/:id/meta", requireAdmin, (req, res) => {
  const u = findUserById(req.params.id);
  if (!u) return res.status(404).send("Biznes topilmadi");
  updateUser(u.id, {
    geminiApiKey: String(req.body.geminiApiKey || "").trim(),
    meta: {
      pageAccessToken: String(req.body.pageAccessToken || "").trim(),
      pageId: String(req.body.pageId || "").trim(),
      igUserId: String(req.body.igUserId || "").trim(),
      whatsappToken: String(req.body.whatsappToken || "").trim(),
      whatsappPhoneNumberId: String(req.body.whatsappPhoneNumberId || "").trim(),
    },
  });
  res.redirect(`/admin/user/${u.id}?saved=1`);
});
