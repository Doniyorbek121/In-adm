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

let db = { users: [], sessions: {} };

if (existsSync(dbPath)) {
  try {
    db = JSON.parse(readFileSync(dbPath, "utf8"));
    db.users ||= [];
    db.sessions ||= {};
  } catch {
    console.error("db.json o'qib bo'lmadi — yangi baza yaratiladi");
  }
}

function save() {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// ==== Foydalanuvchilar ====

export function createUser({ email, passwordHash, salt, businessName }) {
  const user = {
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
  };
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
