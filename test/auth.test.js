import test from "node:test";
import assert from "node:assert";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Test bazasini tozalab boshlaymiz
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
rmSync(dataDir, { recursive: true, force: true });

const { register, login } = await import("../src/auth.js");
const { findUserByPlatformId, updateUser } = await import("../src/db.js");

test("ro'yxatdan o'tish va kirish ishlaydi", () => {
  const reg = register("test@example.com", "parol123", "Test Biznes");
  assert.ok(reg.user);
  assert.strictEqual(reg.user.businessName, "Test Biznes");

  const ok = login("test@example.com", "parol123");
  assert.ok(ok.token);

  const bad = login("test@example.com", "notogri");
  assert.ok(bad.error);
});

test("bir email ikki marta ro'yxatdan o'tolmaydi", () => {
  const dup = register("test@example.com", "parol123", "Boshqa");
  assert.ok(dup.error);
});

test("qisqa parol rad etiladi", () => {
  const r = register("new@example.com", "123", "X");
  assert.ok(r.error);
});

test("platforma ID bo'yicha biznes topiladi (webhook routing)", () => {
  const { user } = register("shop@example.com", "parol123", "Do'kon");
  updateUser(user.id, {
    meta: {
      igUserId: "1784140001",
      pageId: "999888777",
      whatsappPhoneNumberId: "555444333",
    },
  });

  assert.strictEqual(findUserByPlatformId("ig", "1784140001")?.id, user.id);
  assert.strictEqual(findUserByPlatformId("page", "999888777")?.id, user.id);
  assert.strictEqual(findUserByPlatformId("whatsapp", "555444333")?.id, user.id);
  assert.strictEqual(findUserByPlatformId("ig", "yoq-id"), null);
});
