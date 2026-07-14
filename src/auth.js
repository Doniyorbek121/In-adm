import crypto from "node:crypto";
import { config } from "./config.js";
import {
  createUser,
  findUserByEmail,
  createSession,
  getSessionUser,
  deleteSession,
  updateUser,
} from "./db.js";

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function register(email, password, businessName) {
  if (!email || !email.includes("@")) {
    return { error: "Email noto'g'ri kiritildi" };
  }
  if (!password || password.length < 6) {
    return { error: "Parol kamida 6 ta belgidan iborat bo'lsin" };
  }
  if (findUserByEmail(email)) {
    return { error: "Bu email allaqachon ro'yxatdan o'tgan" };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const user = createUser({
    email,
    salt,
    passwordHash: hashPassword(password, salt),
    businessName,
  });
  return { user };
}

export function login(email, password) {
  const user = findUserByEmail(email);
  if (!user) return { error: "Email yoki parol noto'g'ri" };
  const hash = hashPassword(password || "", user.salt);
  const ok = crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(user.passwordHash)
  );
  if (!ok) return { error: "Email yoki parol noto'g'ri" };
  return { user, token: createSession(user.id) };
}

export function logout(token) {
  deleteSession(token);
}

/** Parolni o'zgartiradi (avval eski parolni tekshiradi) */
export function changePassword(user, oldPassword, newPassword) {
  const hash = hashPassword(oldPassword || "", user.salt);
  const ok = crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(user.passwordHash)
  );
  if (!ok) return { error: "Joriy parol noto'g'ri" };
  if (!newPassword || newPassword.length < 6) {
    return { error: "Yangi parol kamida 6 ta belgidan iborat bo'lsin" };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  updateUser(user.id, { salt, passwordHash: hashPassword(newPassword, salt) });
  return { ok: true };
}

/** Cookie sarlavhasidan sid qiymatini ajratib oladi */
export function parseSid(req) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(/(?:^|;\s*)sid=([^;]+)/);
  return match ? match[1] : null;
}

/** Kirgan foydalanuvchini req.user ga qo'yadi (bo'lmasa null) */
export function attachUser(req, _res, next) {
  req.user = getSessionUser(parseSid(req));
  next();
}

/** Faqat kirgan foydalanuvchilar uchun sahifalar */
export function requireAuth(req, res, next) {
  if (!req.user) return res.redirect("/login");
  next();
}

/** Foydalanuvchi admin (dasturchi) ekanmi? */
export function isAdmin(user) {
  if (!user) return false;
  return config.adminEmails.includes(user.email);
}

/** Faqat admin uchun sahifalar */
export function requireAdmin(req, res, next) {
  if (!req.user) return res.redirect("/login");
  if (!isAdmin(req.user)) return res.status(403).send("Ruxsat yo'q");
  next();
}
