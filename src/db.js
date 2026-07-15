import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

const dataDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data"
);
const dbPath = path.join(dataDir, "db.json");

const TRIAL_DAYS = 14;

let db = { users: [], sessions: {} };

if (existsSync(dbPath)) {
  try {
    db = JSON.parse(readFileSync(dbPath, "utf8"));
    db.users ||= [];
    db.sessions ||= {};
    db.users.forEach(normalizeUser);
  } catch {
    console.error("db.json o'qib bo'lmadi — yangi baza yaratiladi");
  }
}

/** Eski yozuvlarga yangi maydonlar qo'shilishini ta'minlaydi */
function normalizeUser(u) {
  u.meta ||= {};
  u.subscription ||= {
    plan: "start",
    status: "trial",
    trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString(),
    expiresAt: null,
  };
  u.settings ||= { voiceReplies: false, telegramChatId: "" };
  if (u.settings.telegramChatId === undefined) u.settings.telegramChatId = "";
  u.stats ||= {
    messages: 0,
    customers: {},
    channels: { instagram: 0, facebook: 0, whatsapp: 0 },
    days: {},
    orders: 0,
  };
  u.handoffs ||= [];
  u.manualChats ||= {};
  u.leads ||= []; // oxirgi mijozlar (mini-CRM)
  u.chats ||= {}; // suhbat tarixi: chatKey -> [{role, text}]
  return u;
}

function save() {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

/** Boshqa modullar user obyektini o'zgartirgach saqlash uchun */
export function persist() {
  save();
}

// ==== Foydalanuvchilar ====

export function createUser({ email, passwordHash, salt, businessName }) {
  const user = normalizeUser({
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    passwordHash,
    salt,
    businessName: businessName || "",
    businessInfo: "",
    geminiApiKey: "",
    meta: {
      pageAccessToken: "",
      pageId: "",
      igUserId: "",
      whatsappToken: "",
      whatsappPhoneNumberId: "",
    },
    createdAt: new Date().toISOString(),
  });
  db.users.push(user);
  save();
  return user;
}

export function findUserByEmail(email) {
  const e = String(email || "").toLowerCase().trim();
  return db.users.find((u) => u.email === e) || null;
}

export function findUserById(id) {
  return db.users.find((u) => u.id === id) || null;
}

/** Barcha foydalanuvchilar ro'yxati (admin uchun) */
export function listUsers() {
  return db.users.slice();
}

export function updateUser(id, patch) {
  const user = findUserById(id);
  if (!user) return null;
  if (patch.meta) {
    user.meta = { ...user.meta, ...patch.meta };
    delete patch.meta;
  }
  Object.assign(user, patch);
  save();
  return user;
}

/**
 * Kiruvchi webhookni qaysi foydalanuvchiga tegishli ekanini topadi.
 * kind: "ig" | "page" | "whatsapp", platformId: Meta yuborgan ID
 */
export function findUserByPlatformId(kind, platformId) {
  const id = String(platformId || "");
  if (!id) return null;
  return (
    db.users.find((u) => {
      if (kind === "ig") return u.meta.igUserId === id;
      if (kind === "page") return u.meta.pageId === id;
      if (kind === "whatsapp") return u.meta.whatsappPhoneNumberId === id;
      return false;
    }) || null
  );
}

// ==== Sessiyalar ====

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions[token] = { userId, createdAt: Date.now() };
  save();
  return token;
}

export function getSessionUser(token) {
  const session = token && db.sessions[token];
  if (!session) return null;
  // 30 kundan eski sessiyalar bekor bo'ladi
  if (Date.now() - session.createdAt > 30 * 24 * 60 * 60 * 1000) {
    delete db.sessions[token];
    save();
    return null;
  }
  return findUserById(session.userId);
}

export function deleteSession(token) {
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    save();
  }
}
