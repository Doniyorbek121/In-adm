import test from "node:test";
import assert from "node:assert";

// Testda API kalit yo'q — AI o'chiq bo'lishi va kalit so'z
// qoidalariga qaytishi (fallback) tekshiriladi
delete process.env.ANTHROPIC_API_KEY;

const { aiEnabled, generateReply } = await import("../src/ai.js");

test("API kalit bo'lmasa AI o'chiq bo'ladi", () => {
  assert.strictEqual(aiEnabled, false);
});

test("AI o'chiq bo'lsa kalit so'z qoidasi ishlaydi", async () => {
  const reply = await generateReply("user-1", "narxi qancha?");
  assert.match(reply, /Narxlar/);
});

test("AI o'chiq bo'lsa ham default javob qaytadi", async () => {
  const reply = await generateReply("user-2", "qwertyuiop");
  assert.ok(reply.length > 0);
});
