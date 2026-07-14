/** Barcha sahifalar uchun umumiy HTML qobiq */
export function page(title, body, { user } = {}) {
  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — AI Biznes Yordamchi</title>
<style>
  :root { --brand: #4f46e5; --bg: #f4f5fb; --card: #fff; --text: #1f2330; --muted: #6b7280; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { background: var(--card); border-bottom: 1px solid #e5e7eb; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
  header .logo { font-weight: 700; color: var(--brand); text-decoration: none; font-size: 18px; }
  header nav a { margin-left: 16px; color: var(--muted); text-decoration: none; font-size: 14px; }
  header nav a:hover { color: var(--brand); }
  main { max-width: 760px; margin: 32px auto; padding: 0 16px; }
  .card { background: var(--card); border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  h1 { font-size: 24px; margin: 0 0 6px; } h2 { font-size: 18px; margin: 0 0 12px; }
  p.hint { color: var(--muted); font-size: 14px; margin-top: 4px; }
  label { display: block; font-size: 14px; font-weight: 600; margin: 14px 0 4px; }
  input, textarea { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; }
  textarea { min-height: 260px; resize: vertical; }
  button { margin-top: 16px; background: var(--brand); color: #fff; border: 0; border-radius: 8px; padding: 11px 22px; font-size: 15px; font-weight: 600; cursor: pointer; }
  button:hover { opacity: .92; }
  .error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 14px; }
  .ok { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 14px; }
  .badge { display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 999px; margin-left: 8px; }
  .on { background: #dcfce7; color: #166534; } .off { background: #fee2e2; color: #991b1b; }
  code { background: #eef2ff; padding: 2px 6px; border-radius: 6px; font-size: 13px; }
  a { color: var(--brand); }
  .center { max-width: 420px; margin: 60px auto; }
</style>
</head>
<body>
<header>
  <a class="logo" href="/">🤖 AI Biznes Yordamchi</a>
  <nav>
    ${
      user
        ? `<span style="color:var(--muted);font-size:14px">${esc(user.email)}</span>
           <a href="/dashboard">Boshqaruv</a>
           <a href="/logout">Chiqish</a>`
        : `<a href="/login">Kirish</a> <a href="/register">Ro'yxatdan o'tish</a>`
    }
  </nav>
</header>
<main>${body}</main>
</body>
</html>`;
}

/** HTML belgilarini xavfsiz qiladi (XSS oldini olish) */
export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
