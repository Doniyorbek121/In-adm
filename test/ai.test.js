import test from "node:test";
import assert from "node:assert";

// Testda API kalit yo'q — AI o'chiq bo'lishi va kalit so'z
// qoidalariga qaytishi (fallback) tekshiriladi
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GEMINI_API_KEY;

const { generateReply } = await import("../src/ai.js");

const tenantWithoutAI = {
  id: "t1",
  businessName: "Test Do'kon",
  businessInfo: "Test biznes ma'lumotlari",
  geminiApiKey: "",
  meta: {},
};

test("AI kaliti bo'lmasa kalit so'z qoidasi ishlaydi", async () => {
  const reply = await generateReply(tenantWithoutAI, "user-1", {
    text: "narxi qancha?",
  });
  assert.match(reply, /Narxlar/);
});

test("mos qoida bo'lmasa default javob qaytadi", async () => {
  const reply = await generateReply(tenantWithoutAI, "user-2", {
    text: "qwertyuiop",
  });
  assert.ok(reply.length > 0);
});

test("biznes ma'lumoti bo'lmasa ham javob qaytadi", async () => {
  const emptyTenant = { ...tenantWithoutAI, businessInfo: "" };
  const reply = await generateReply(emptyTenant, "user-3", { text: "salom" });
  assert.ok(reply.length > 0);
});
