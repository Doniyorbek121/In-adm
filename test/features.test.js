import test from "node:test";
import assert from "node:assert";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
rmSync(dataDir, { recursive: true, force: true });

const { register, changePassword, login } = await import("../src/auth.js");
const sub = await import("../src/subscription.js");
const eng = await import("../src/engagement.js");
const { isDuplicate } = await import("../src/dedup.js");
const oauth = await import("../src/oauth.js");

function newUser(email) {
  return register(email, "parol123", "Test").user;
}

// ==== Obuna ====

test("yangi foydalanuvchi trial bilan boshlaydi va faol", () => {
  const u = newUser("trial@x.uz");
  assert.strictEqual(u.subscription.status, "trial");
  assert.strictEqual(sub.isActive(u), true);
});

test("trial tugagan bo'lsa faol emas", () => {
  const u = newUser("expired@x.uz");
  u.subscription.trialEndsAt = new Date(Date.now() - 86400000).toISOString();
  assert.strictEqual(sub.isActive(u), false);
});

test("admin faollashtirsa obuna faol bo'ladi", () => {
  const u = newUser("paid@x.uz");
  u.subscription.trialEndsAt = new Date(Date.now() - 86400000).toISOString();
  sub.activate(u, 30, "pro");
  assert.strictEqual(sub.isActive(u), true);
  assert.strictEqual(u.subscription.plan, "pro");
});

test("bekor qilingan obuna faol emas", () => {
  const u = newUser("off@x.uz");
  sub.activate(u, 30);
  sub.deactivate(u);
  assert.strictEqual(sub.isActive(u), false);
});

// ==== Statistika ====

test("xabarlar va noyob mijozlar hisoblanadi", () => {
  const u = newUser("stats@x.uz");
  eng.recordMessage(u, "whatsapp", "555", "salom");
  eng.recordMessage(u, "whatsapp", "555", "narx?");
  eng.recordMessage(u, "instagram", "777", "buyurtma beraman");
  const s = eng.statsSummary(u);
  assert.strictEqual(s.messages, 3);
  assert.strictEqual(s.customers, 2);
  assert.strictEqual(s.channels.whatsapp, 2);
  assert.strictEqual(s.orders, 1); // "buyurtma" so'zi
});

// ==== Operator chaqirish ====

test("operator so'zi handoff sifatida aniqlanadi", () => {
  assert.strictEqual(eng.isHandoffRequest("menga operator kerak"), true);
  assert.strictEqual(eng.isHandoffRequest("narxi qancha"), false);
});

test("handoff chatni qo'lda rejimga o'tkazadi va hal qilinadi", () => {
  const u = newUser("handoff@x.uz");
  eng.startHandoff(u, "whatsapp", "999");
  assert.strictEqual(eng.isManual(u, "999"), true);
  assert.strictEqual(eng.pendingHandoffs(u).length, 1);

  const id = eng.pendingHandoffs(u)[0].id;
  eng.resolveHandoff(u, id);
  assert.strictEqual(eng.isManual(u, "999"), false);
  assert.strictEqual(eng.pendingHandoffs(u).length, 0);
});

// ==== Xabar dedup ====

test("takroriy webhook xabari aniqlanadi", () => {
  assert.strictEqual(isDuplicate("msg-1"), false); // birinchi marta
  assert.strictEqual(isDuplicate("msg-1"), true); // takror
  assert.strictEqual(isDuplicate("msg-2"), false);
  assert.strictEqual(isDuplicate(""), false); // ID yo'q — dedup qilinmaydi
});

// ==== Parol o'zgartirish ====

test("to'g'ri joriy parol bilan parol o'zgaradi", () => {
  const u = newUser("pw@x.uz");
  const bad = changePassword(u, "notogri", "yangiparol");
  assert.ok(bad.error);
  const ok = changePassword(u, "parol123", "yangiparol");
  assert.ok(ok.ok);
  assert.ok(login("pw@x.uz", "yangiparol").token);
});

// ==== Facebook OAuth ====

test("OAuth kalitlarsiz o'chiq bo'ladi", () => {
  // Testda FB_APP_ID/BASE_URL yo'q — oauthAvailable false bo'lishi kerak
  assert.strictEqual(oauth.oauthAvailable, false);
});

test("authUrl to'g'ri Facebook manzilini quradi", () => {
  const url = oauth.authUrl("test-state");
  assert.match(url, /facebook\.com/);
  assert.match(url, /dialog\/oauth/);
  assert.match(url, /state=test-state/);
  assert.match(url, /instagram_manage_messages/);
});
