# AI Biznes Yordamchi 🤖

Instagram, Facebook va WhatsApp uchun **veb-platforma ko'rinishidagi AI avtomatlashtirish tizimi**. Rasmiy Meta Graph API asosida ishlaydi — akkauntlar blok bo'lish xavfi yo'q.

**Har qanday tadbirkor foydalana oladi**: saytda ro'yxatdan o'tadi, veb-panelda o'z biznesini AI'ga o'rgatadi (mahsulotlar, narxlar, manzil...), Instagram/WhatsApp/Facebook'ini ulaydi — bot mijozlarga xuddi tirik operator kabi javob bera boshlaydi.

## Imkoniyatlar

| | |
|---|---|
| 🌐 **Veb-panel** | Ro'yxatdan o'tish, kirish, barcha sozlamalar brauzerda — kod kerak emas |
| 🧠 **AI o'qitish** | Har bir biznes o'z ma'lumotlarini yozadi, AI shu asosda javob beradi |
| 💬 **Matn** | Instagram Direct, kommentlar, Messenger, WhatsApp — mijoz tilida (uz/ru/en) javob |
| 🎤 **Ovozli xabarlar** | AI ovozni eshitib, mazmuniga javob beradi (Gemini) |
| 📸 **Rasm va video** | AI ko'rib tahlil qiladi — mahsulot rasmi bo'lsa narxini aytadi |
| 🗣️ **Suhbat tarixi** | Har mijoz bilan kontekst saqlanadi — tabiiy muloqot |
| 👥 **Multi-tenant** | Bitta serverda istalgancha biznes — har birining o'z tokenlari va AI bilimi |
| 🛡️ **Zaxira rejim** | AI ishlamasa kalit so'z qoidalari (`rules.json`) ishlaydi — mijoz javobsiz qolmaydi |

## Qanday ishlaydi

```
Mijoz (Instagram/WhatsApp/Facebook)
        │  xabar / ovoz / rasm / video
        ▼
Meta webhook ──► Server: qaysi biznesga tegishli? (ID bo'yicha)
        ▼
AI (Gemini) ◄── shu biznesning ma'lumotlari + suhbat tarixi
        ▼
Tabiiy javob mijozga qaytariladi
```

## O'rnatish (server egasi uchun)

Talablar: Node.js 18+ (media tahlili uchun 18.17+ tavsiya).

```bash
npm install
cp .env.example .env    # VERIFY_TOKEN va APP_SECRET kiriting
npm start
```

Brauzerda `http://localhost:3000` — tayyor. Production'da domen ulang (webhook uchun HTTPS shart; test uchun `ngrok http 3000`).

`.env` da ixtiyoriy ravishda **umumiy** `GEMINI_API_KEY` berish mumkin — o'z kalitini kiritmagan foydalanuvchilar uchun ishlaydi.

## Foydalanish (tadbirkor uchun)

1. **Ro'yxatdan o'ting** — saytda email va parol bilan.
2. **AI'ni o'rgating** — panelda biznesingiz haqida yozing: mahsulotlar, narxlar, manzil, ish vaqti, yetkazib berish, to'lovlar, savol-javoblar. Oddiy matn, kod kerak emas.
3. **AI kalitini kiriting** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) dan bepul Gemini kaliti oling.
4. **Platformalarni ulang** — Meta tokenlari va ID'larni panelga kiriting:
   - Page Access Token, Page ID, Instagram Business ID (Instagram + Facebook uchun)
   - WhatsApp Token, Phone Number ID (WhatsApp uchun)
5. Bo'ldi — mijozlaringizga AI javob bera boshlaydi.

## Meta App sozlash (bir marta, server egasi)

1. [developers.facebook.com](https://developers.facebook.com) da App yarating.
2. Webhooks bo'limida Callback URL: `https://domeningiz/webhook`, Verify Token: `.env` dagi `VERIFY_TOKEN`.
3. Obunalar: **Instagram** — `messages`, `comments`; **Page** — `messages`, `feed`; **WhatsApp** — `messages`.
4. Production uchun App Review: `instagram_manage_messages`, `instagram_manage_comments`, `pages_messaging` ruxsatlari.

## Muhim Meta qoidalari

- DM'da bot mijoz yozganidan keyin **24 soat ichida** erkin javob bera oladi.
- Kommentga shaxsiy javob (Private Reply) komment yozilganidan keyin **7 kun ichida** mumkin.

## Test

```bash
npm test
```

## Loyiha tuzilishi

```
src/
  index.js              — Express server: veb-panel + multi-tenant webhook
  config.js             — .env sozlamalari
  db.js                 — foydalanuvchilar bazasi (JSON fayl), platforma ID routing
  auth.js               — ro'yxat/kirish, scrypt parol hash, cookie sessiyalar
  web/
    layout.js           — HTML shablon
    routes.js           — panel sahifalari (dashboard, sozlamalar)
  ai.js                 — multimodal AI (Gemini: matn+ovoz+rasm+video; Claude: matn+rasm)
  media.js              — IG/WhatsApp mediani yuklab olish (base64)
  autoReply.js          — kalit so'z qoidalari (zaxira rejim)
  graph.js              — Meta Graph API so'rovlari
  handlers/             — Instagram, Facebook, WhatsApp hodisalari
  services/             — javob yuborish (har biznesning o'z tokenlari bilan)
rules.json              — zaxira javob qoidalari
business.md             — biznes ma'lumotlari namunasi (panelga ko'chirish uchun)
data/db.json            — baza (avtomatik yaratiladi, git'ga kirmaydi)
```

## Kengaytirish g'oyalari

- Ovozli javob (TTS) — hozircha bot ovozga matn bilan javob beradi
- Buyurtmalarni panelda ko'rish, statistika
- Operator aralashuvi rejimi ("odam chaqirish" tugmasi)
- PostgreSQL'ga o'tish (hozir JSON fayl — kichik/o'rta yuk uchun yetarli)
