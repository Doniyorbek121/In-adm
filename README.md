# Meta Avtomatlashtirish Boti 🤖

Instagram, Facebook va WhatsApp uchun **AI asosidagi avtomatik javob beruvchi bot**. Rasmiy Meta Graph API asosida ishlaydi — akkauntingiz blok bo'lish xavfi yo'q.

**Har kim o'z biznesiga moslashtira oladi**: `business.md` fayliga biznesingiz haqida yozasiz (mahsulotlar, narxlar, manzil, yetkazib berish...) — AI mijozlarga aynan shu ma'lumot asosida, mijozning tilida javob beradi. AI sifatida **Gemini** (bepul tarifi bor) yoki **Claude** ishlatish mumkin. AI kaliti bo'lmasa, bot `rules.json` dagi kalit so'z qoidalari bilan ishlashda davom etadi.

## Nimalarni qiladi

| Platforma | Imkoniyat |
|---|---|
| **Instagram** | Direct (DM) xabarlarga avtomatik javob |
| **Instagram** | Kommentlarga ochiq javob + komment egasiga Direct'ga shaxsiy xabar |
| **Facebook** | Messenger xabarlariga avtomatik javob |
| **Facebook** | Sahifa postlaridagi kommentlarga avtomatik javob |
| **WhatsApp** | Kiruvchi xabarlarga avtomatik javob (Cloud API) |

## Javoblar qanday tanlanadi

1. **AI rejimi** (`GEMINI_API_KEY` yoki `ANTHROPIC_API_KEY` berilgan bo'lsa): AI `business.md` dagi ma'lumotlar asosida javob yozadi. Har bir mijoz bilan suhbat tarixini eslab qoladi (oxirgi 10 xabar), shuning uchun "narxi qancha?" → "qaysi mahsulot?" → "erkaklar ko'ylagi" kabi tabiiy suhbat bo'ladi. Mijoz qaysi tilda yozsa (o'zbek/rus/ingliz), o'sha tilda javob oladi.
2. **Kalit so'z rejimi** (AI kaliti yo'q bo'lsa yoki AI'da xato bo'lsa): `rules.json` dagi qoidalar ishlaydi — mijoz "narx" deb yozsa narx haqidagi javob ketadi. Bot hech qachon javobsiz qolmaydi.

## Talablar

- Node.js 18+
- Facebook sahifa + unga ulangan **Instagram Business/Creator** akkaunt
- [Meta Developer](https://developers.facebook.com) hisobida yaratilgan App
- WhatsApp uchun: WhatsApp Business Cloud API sozlangan bo'lishi kerak

## O'rnatish

```bash
npm install
cp .env.example .env
# .env faylini to'ldiring (quyida qaysi qiymatni qayerdan olish yozilgan)
npm start
```

## .env sozlamalari

| O'zgaruvchi | Qayerdan olinadi |
|---|---|
| `VERIFY_TOKEN` | O'zingiz o'ylab topasiz. Meta panelda webhook sozlashda aynan shuni kiritasiz |
| `APP_SECRET` | Meta App → Settings → Basic → App Secret |
| `PAGE_ACCESS_TOKEN` | Meta App → Messenger → Instagram/Page sozlamalaridan token generatsiya qilinadi |
| `IG_USER_ID` | Instagram Business akkaunt ID'si (`me/accounts` orqali topiladi) |
| `WHATSAPP_TOKEN` | Meta App → WhatsApp → API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta App → WhatsApp → API Setup → Phone number ID |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — bepul tarif bor. Ixtiyoriy |
| `GEMINI_MODEL` | Ixtiyoriy, standart: `gemini-2.5-flash` |
| `ANTHROPIC_API_KEY` | [platform.claude.com](https://platform.claude.com) → API Keys. Ixtiyoriy |
| `AI_MODEL` | Claude modeli, ixtiyoriy, standart: `claude-opus-4-8` |

AI provayderi avtomatik tanlanadi: `GEMINI_API_KEY` bo'lsa Gemini, bo'lmasa `ANTHROPIC_API_KEY` bo'lsa Claude, ikkalasi ham bo'lmasa kalit so'z rejimi.

## AI'ni o'z biznesingizga o'rgatish

`business.md` faylini oching va namuna o'rniga o'z biznesingiz haqida yozing:
nom, mahsulotlar, narxlar, manzil, ish vaqti, yetkazib berish shartlari,
to'lov usullari, tez-tez so'raladigan savollar. Oddiy matn — hech qanday kod
kerak emas. Qancha to'liq yozsangiz, AI shuncha aniq javob beradi.

Muhim: AI faylda yo'q narsani o'ylab topmasligi uchun ko'rsatma berilgan —
bilmagan savoliga "operatorimiz aniqlik kiritadi" deb javob beradi.

O'zgartirgandan keyin serverni qayta ishga tushiring.

## Webhook'ni ulash

1. Serverni internetga chiqaring (production'da o'z domeningiz, test uchun `ngrok http 3000`).
2. Meta App panelida **Webhooks** bo'limiga kiring.
3. Callback URL: `https://sizning-domeningiz.uz/webhook`, Verify Token: `.env`dagi `VERIFY_TOKEN`.
4. Quyidagi obunalarni yoqing:
   - **Instagram**: `messages`, `comments`
   - **Page**: `messages`, `feed`
   - **WhatsApp Business Account**: `messages`
5. Sahifangizni App'ga ulang (Messenger → Instagram settings).

## Javob qoidalarini o'zgartirish

`rules.json` faylini oching:

```json
{
  "defaultReply": "Hech narsa mos kelmasa yuboriladigan javob",
  "commentReply": "Kommentga yoziladigan ochiq javob",
  "commentPrivateReply": "Komment egasining Direct'iga boradigan xabar",
  "rules": [
    {
      "keywords": ["narx", "qancha"],
      "reply": "Mijoz shu so'zlarni yozsa, shu javob ketadi"
    }
  ]
}
```

O'zgartirgandan keyin serverni qayta ishga tushiring.

## Test

```bash
npm test
```

## Muhim eslatmalar

- Meta qoidasiga ko'ra, kommentga **shaxsiy javob** (Private Reply) faqat komment yozilganidan keyin **7 kun ichida** yuborilishi mumkin.
- DM'da bot faqat foydalanuvchi yozganidan keyin **24 soat ichida** erkin javob bera oladi (Meta "24-hour window" qoidasi).
- App production rejimga chiqishi uchun Meta App Review'dan o'tish kerak (`instagram_manage_messages`, `instagram_manage_comments`, `pages_messaging` ruxsatlari).

## Loyiha tuzilishi

```
src/
  index.js              — Express server, webhook qabul qilish, imzo tekshiruvi
  config.js             — .env sozlamalari
  graph.js              — Graph API'ga so'rov yuborish
  ai.js                 — Claude AI javoblari (business.md asosida, suhbat tarixi bilan)
  autoReply.js          — kalit so'z bo'yicha javob topish (zaxira rejim)
  handlers/
    instagram.js        — Instagram DM va komment hodisalari
    facebook.js         — Messenger va sahifa komment hodisalari
    whatsapp.js         — WhatsApp xabar hodisalari
  services/
    instagram.js        — IG'ga javob yuborish (komment, private reply, DM)
    messenger.js        — Messenger xabar va FB komment javobi
    whatsapp.js         — WhatsApp xabar yuborish
rules.json              — javob qoidalari (kalit so'zlar, zaxira rejim)
business.md             — biznes ma'lumotlari (AI shu asosda javob beradi)
```
