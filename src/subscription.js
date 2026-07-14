import { persist } from "./db.js";

// Tarif rejalari (narxlar so'mda, oyiga)
export const PLANS = {
  start: {
    id: "start",
    name: "Start",
    price: 199000,
    features: ["Instagram + WhatsApp", "AI matn javoblari", "Statistika"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 399000,
    features: [
      "Barcha kanallar (IG, FB, WhatsApp)",
      "AI matn + ovoz/rasm/video tahlili",
      "Ovozli javob (TTS)",
      "Operator chaqirish rejimi",
      "Kengaytirilgan statistika",
    ],
  },
};

/** Obuna hozir faolmi? (trial tugamagan yoki to'langan muddat ichida) */
export function isActive(user) {
  const s = user.subscription;
  if (!s) return false;
  const now = Date.now();
  if (s.status === "active" && s.expiresAt && new Date(s.expiresAt) > now) {
    return true;
  }
  if (s.status === "trial" && s.trialEndsAt && new Date(s.trialEndsAt) > now) {
    return true;
  }
  return false;
}

/** Obuna holati (panelda ko'rsatish uchun) */
export function statusInfo(user) {
  const s = user.subscription || {};
  const now = Date.now();
  if (s.status === "active" && s.expiresAt) {
    const until = new Date(s.expiresAt);
    const active = until > now;
    return {
      active,
      label: active ? "Faol obuna" : "Obuna tugagan",
      until,
      kind: active ? "active" : "expired",
    };
  }
  if (s.status === "trial" && s.trialEndsAt) {
    const until = new Date(s.trialEndsAt);
    const active = until > now;
    const days = Math.ceil((until - now) / 86400000);
    return {
      active,
      label: active ? `Sinov muddati (${days} kun qoldi)` : "Sinov muddati tugadi",
      until,
      kind: active ? "trial" : "expired",
    };
  }
  return { active: false, label: "Obuna yo'q", until: null, kind: "expired" };
}

/**
 * Obunani faollashtiradi/uzaytiradi (admin to'lovni tasdiqlagach).
 * Agar obuna hali faol bo'lsa — mavjud muddatga qo'shiladi.
 */
export function activate(user, days, plan) {
  const now = Date.now();
  const s = user.subscription;
  const base =
    s.status === "active" && s.expiresAt && new Date(s.expiresAt) > now
      ? new Date(s.expiresAt).getTime()
      : now;
  s.status = "active";
  s.expiresAt = new Date(base + days * 86400000).toISOString();
  if (plan && PLANS[plan]) s.plan = plan;
  persist();
  return user;
}

/** Obunani bekor qiladi (admin) */
export function deactivate(user) {
  user.subscription.status = "expired";
  user.subscription.expiresAt = null;
  persist();
  return user;
}
