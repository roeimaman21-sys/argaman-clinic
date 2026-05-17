# מדיניות אבטחת מידע — קליניקת ארגמן

**עדכון אחרון:** 16 במאי 2026 · גרסה 1.0
**אחראי:** גל ממן (ממונה על אבטחת מידע)

---

## תקני ציות

מערכת הניהול והאתר עומדים בדרישות הבאות:

- **תקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017** — רמת אבטחה גבוהה (לאור הימצאות נתוני מטופלים)
- **חוק הגנת הפרטיות, התשמ"א-1981**
- **OWASP Top 10 (2024)** — מותאם נגד 10 הסיכונים המובילים
- **CSP Level 3** — Content Security Policy מהדק

---

## רכיבי אבטחה מיושמים

### 1. אימות (Authentication)
- **PBKDF2-SHA256** עם 250,000 איטרציות (תואם המלצת OWASP 2023)
- **Salt אקראי 128-bit** לכל סיסמה
- **השוואה בזמן קבוע** (constant-time) — הגנה נגד timing attacks
- **כפיית שינוי סיסמת ברירת מחדל** בכניסה ראשונה
- **בדיקת חוזק סיסמה** — מינימום 12 תווים, ציון 60/100

### 2. הצפנה (Encryption)
- **AES-GCM 256-bit** — תקן צבאי, מאושר NIST
- **IV אקראי 96-bit** לכל הצפנה (לא חוזר)
- **Key derivation** — נגזר מסיסמת המשתמש (לא נשמר באף מקום)
- **מפתח בזיכרון בלבד** — נמחק על logout / timeout / page reload
- **הצפנת PII** — leads, clients, sessions, activity (שמות, טלפונים, רישומי פגישות)

### 3. תקשורת (Transport)
- **HTTPS חובה** — HSTS עם preload (max-age=63072000)
- **TLS 1.3** — דרך Netlify CDN
- **upgrade-insecure-requests** — כל HTTP מועבר ל-HTTPS

### 4. Session Management
- **Session timeout idle:** 30 דקות
- **Session timeout absolute:** 8 שעות
- **ניטור פעילות:** mousemove, keydown, click, touch, scroll
- **לוגאוט אוטומטי** עם הודעה ברורה
- **לא נשמרת בין רענוני דף** — דורש re-login לאחר reload

### 5. Rate Limiting
- **חסימה אוטומטית** ל-15 דקות אחרי 5 ניסיונות כושלים
- **תיעוד כל ניסיון** ביומן הביקורת
- **נעילה לפי localStorage** (לא ניתן לעקיפה ע"י סגירת טאב)

### 6. Audit Logging
- **כל אירוע נרשם** — login_success, login_failed, login_blocked, logout, session_timeout, password_changed, backup_exported
- **שמירה של 500 אירועים אחרונים** ב-localStorage
- **ייצוא ל-CSV** עם UTF-8 BOM (תואם Excel)
- **מחיקה דורשת אישור** מפורש

### 7. HTTP Security Headers
מיושם דרך `_headers` בכל תגובת Netlify:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS בלבד למשך שנתיים |
| `X-Frame-Options` | `DENY` | מניעת clickjacking |
| `X-Content-Type-Options` | `nosniff` | מניעת MIME-sniff attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | מניעת דליפת URL |
| `Permissions-Policy` | מצומצם (camera, mic, geo, payment...) | חסימת APIs לא נחוצים |
| `Content-Security-Policy` | מותאם | מניעת XSS, code injection |
| `Cross-Origin-Opener-Policy` | `same-origin` | בידוד תהליכים |
| `Frame-ancestors` | `'none'` (admin) | מניעת iframe embedding |
| `Cache-Control` (admin) | `no-store, no-cache` | לא נשמר במטמון |

### 8. Robots & Indexing
- `/admin.html` — `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`
- חסום ב-`robots.txt`

---

## דרישות הגדרה ידנית — Supabase RLS

**⚠️ חובה!** למרות שהמידע מוצפן צד-לקוח, חובה להגדיר Row-Level Security ב-Supabase:

```sql
-- Enable RLS on the table
ALTER TABLE argaman_data ENABLE ROW LEVEL SECURITY;

-- Option A: Block all anon access entirely (recommended)
-- Requires using Service Role key from a backend (Edge Function)
CREATE POLICY "Deny all anon" ON argaman_data
  FOR ALL TO anon USING (false);

-- Option B: Require a secret header (current option, defense-in-depth)
CREATE POLICY "Require secret header" ON argaman_data
  FOR ALL TO anon
  USING (current_setting('request.headers')::json->>'x-argaman-key' = 'YOUR_SECRET_HERE');
```

**גם בלי RLS — המידע הרגיש לא חשוף**, כי הוא מוצפן AES-256 לפני שמירה. אבל RLS הוא שכבת הגנה נוספת חיונית.

---

## OWASP Top 10 (2024) — Mitigation Map

| # | Risk | Mitigation |
|---|------|-----------|
| A01 | Broken Access Control | PBKDF2 auth, session timeout, audit log, RLS guide |
| A02 | Cryptographic Failures | AES-GCM 256, PBKDF2 250K iter, secure random IVs |
| A03 | Injection | escapeHtml(), sanitizeHTML(), CSP, no eval() |
| A04 | Insecure Design | Defense-in-depth, encryption at rest, fail-closed |
| A05 | Security Misconfiguration | CSP, HSTS, X-Frame DENY, no-cache admin |
| A06 | Vulnerable Components | Pinned versions, jsDelivr/unpkg, no NPM in prod |
| A07 | Auth Failures | Rate limiting, strong-pw enforcement, audit log |
| A08 | Software/Data Integrity | SRI not yet (TODO), pinned CDN versions |
| A09 | Logging/Monitoring | Full audit log, 500 entries retention, export CSV |
| A10 | SSRF | No server-side requests from admin |

---

## הליך תגובה לאירוע אבטחה

במקרה של חשד לפריצה / דליפת מידע:

1. **מיידי (0-1 שעה):**
   - שינוי סיסמה דרך פאנל אבטחה
   - בדיקת יומן ביקורת — ייצוא לראיה
   - ניתוק חשבון Supabase / החלפת anon key

2. **תוך 24 שעות:**
   - תיעוד מלא של האירוע
   - הערכה: אילו נתונים נחשפו?
   - אם מטופלים נפגעו — הודעה אישית

3. **תוך 72 שעות (חובה לפי תקנות):**
   - דיווח לרשם מאגרי המידע (הרשות להגנת הפרטיות)
   - הודעה למטופלים שנפגעו
   - תיעוד אמצעי תיקון

**פרטי דיווח:** [הרשות להגנת הפרטיות](https://www.gov.il/he/departments/the_privacy_protection_authority)

---

## גיבויים

- **גיבוי מוצפן ידני** — דרך פאנל "אבטחה ויומן" → ייצוא גיבוי
- **גיבוי ענן** — Supabase שומר אוטומטית (7 ימים אחרונים)
- **המלצה:** גיבוי שבועי + שמירה במקום מאובטח (USB מוצפן / cloud מוצפן אחר)

---

## הגדרות סיסמה מומלצות

- **אורך:** 16-20 תווים
- **תווים:** אותיות גדולות + קטנות + ספרות + סימני פיסוק
- **לא לחזור:** על דפוסים (123, abc), מילים נפוצות, שמות
- **לא לשתף:** עם איש (כולל ספקי שירות)
- **לאחסן:** במנהל סיסמאות (1Password, Bitwarden, KeePass)

---

## פרטי קשר — אירועי אבטחה

**ממונה אבטחת מידע:** גל ממן
📧 argamanclinic@gmail.com
📞 050-641-5222
📍 דרך יצחק רבין 8, בית שמש

**רגולטור:** [הרשות להגנת הפרטיות, משרד המשפטים](https://www.gov.il/he/departments/the_privacy_protection_authority)
