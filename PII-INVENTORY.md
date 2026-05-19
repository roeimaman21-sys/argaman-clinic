# PII Inventory Map — מפת PII במערכת
## קליניקת ארגמן · מסמך טכני-משפטי

**מסמך זה מתעד כל שדה של מידע אישי / רגיש במערכת — איפה נשמר, איך מוצפן, ולכמה זמן.**

---

## Legend (סימנים)

| סימן | משמעות |
|---|---|
| 🔴 | **PHI קריטי** — חיסיון רפואי (תיק טיפול, ציוני סיכון) |
| 🟠 | **PII רגיש** — מזהה אישי + הקשר טיפולי (שם בליד, טלפון) |
| 🟡 | **PII כללי** — מידע מזהה (שם, אימייל) |
| 🟢 | **מטא-נתונים** — לא מזהה (timestamps, IDs) |
| 🔐 | מוצפן AES-256-GCM client-side |
| 🔒 | מוצפן ב-Supabase at-rest (server-side) |
| 📦 | מוגן ע"י RLS |

---

## Tables ב-Supabase

### `argaman_data` (Key-Value מאוחסן מוצפן)

| key | שדות פנימיים | סיווג | הצפנה | retention | RLS |
|---|---|---|---|---|---|
| `argaman_clients` | id, name, phone, email, status, type, startDate, notes[], tags[], documents[] | 🔴 PHI | 🔐 + 🔒 | משך טיפול + 7 שנים | 📦 owner only |
| `argaman_leads` | id, name, phone, email, status, source, topic, notes[], tags[], createdAt, lastTouchedAt | 🟠 | 🔐 + 🔒 | 12 חודש אם לא הומר | 📦 owner only |
| `argaman_sessions` | id, clientId, date, time, status, paid, price, soapNotes{}, location | 🔴 PHI | 🔐 + 🔒 | משך טיפול + 7 שנים | 📦 owner only |
| `argaman_outcomes` | clientId, sessionId, instrument (PHQ-9/GAD-7/...), score, items[] | 🔴 PHI | 🔐 + 🔒 | משך טיפול + 7 שנים | 📦 owner only |
| `argaman_risk_assessments` | clientId, sessionId, instrument (C-SSRS/AUDIT), score, urgency, plan | 🔴 PHI | 🔐 + 🔒 | משך טיפול + 7 שנים | 📦 owner only |
| `argaman_audit_log` (legacy) | id, action, at, user | 🟢 | 🔒 | 24 חודש | 📦 owner only |
| `argaman_voice_recordings` | clientId, sessionId, audio (base64) | 🔴 PHI | 🔐 + 🔒 | משך טיפול בלבד | 📦 owner only |
| `argaman_genograms` | clientId, structure (JSON) | 🔴 PHI | 🔐 + 🔒 | משך טיפול + 7 שנים | 📦 owner only |
| `argaman_treatment_plans` | clientId, goals[], interventions[], target_dates | 🔴 PHI | 🔐 + 🔒 | משך טיפול + 7 שנים | 📦 owner only |
| `argaman_notifications` | userId, msg, read | 🟢 | 🔒 | 90 ימים | 📦 owner only |
| `argaman_time_logs` | clientId, duration, hourlyRate | 🟠 | 🔐 + 🔒 | 7 שנים | 📦 owner only |
| `argaman_sticky_notes` | userId, text, color | 🟡 | 🔒 | מתבטל ידנית | 📦 owner only |
| `argaman_articles` | id, title, content, slug, published | 🟢 (תוכן ציבורי) | 🔒 | קבוע | 📦 authenticated read |
| `argaman_testimonials` | id, text, author (אנונימי), location, rating | 🟢 (אנונימי) | 🔒 | קבוע | 📦 authenticated read |
| `argaman_workshops`, `argaman_prices`, `argaman_videos`, `argaman_faqs`, `argaman_settings`, `argaman_marketing` | תוכן ציבורי | 🟢 | 🔒 | קבוע | 📦 |

### `argaman_users` (טבלת משתמשי המערכת)

| שדה | סיווג | הצפנה | retention |
|---|---|---|---|
| user_id (UUID) | 🟡 | 🔒 | משך משתמש פעיל |
| email | 🟡 | 🔒 | משך משתמש פעיל |
| role | 🟢 | 🔒 | משך משתמש פעיל |
| display_name | 🟡 | 🔒 | משך משתמש פעיל |
| can_see_phi | 🟢 | 🔒 | משך משתמש פעיל |
| created_at | 🟢 | 🔒 | משך משתמש פעיל |

### `argaman_login_history`

| שדה | סיווג |
|---|---|
| user_id | 🟢 |
| email | 🟡 |
| event (login_success / login_failed / logout / ...) | 🟢 |
| user_agent | 🟢 |
| metadata (JSON) | 🟢 |
| created_at | 🟢 |

Retention: 12 חודש · RLS: owner-read-all + self-read

### `argaman_action_log`

| שדה | סיווג |
|---|---|
| user_id | 🟢 |
| user_email | 🟡 |
| user_role | 🟢 |
| action (create/update/delete/...) | 🟢 |
| entity_type | 🟢 |
| entity_id | 🟢 |
| entity_label | 🟡 (יכול לכלול שם לקוח) |
| metadata | 🟢 |
| created_at | 🟢 |

Retention: 24 חודש · RLS: owner-read-all + self-read

### `argaman_consents` (יתווסף ב-Horizon 1)

| שדה | סיווג | הצפנה |
|---|---|---|
| client_id | 🟢 | 🔒 |
| client_name | 🟡 | 🔒 |
| client_phone_hash | 🟡 | 🔒 (hashed) |
| signature_canvas (base64) | 🟠 | 🔐 |
| consent_text_version | 🟢 | 🔒 |
| timestamp | 🟢 | 🔒 |
| ip_address (אופציונלי) | 🟡 | 🔒 (anonymized) |
| chain_hash (SHA-256 of previous row) | 🟢 | 🔒 |

Retention: לעולם (לראיה משפטית)

---

## פירוט הצפנה

### Client-Side Encryption (🔐) — לפני שליחה ל-Supabase

**אלגוריתם:** AES-256-GCM (Authenticated Encryption)

**גזירת מפתח (DEK):**
- PBKDF2-SHA256, 250,000 iterations
- Salt: `argaman:${user.id}` (deterministic per user)
- מפתח (DEK): 256 ביט, נשמר רק ב-`SESSION_ENC_KEY` (browser memory)

**IV (Nonce):**
- 12 ביט אקראי לכל encryption
- מצורף ל-ciphertext

**Authentication Tag:**
- 128 ביט מצורף
- כל manipulation של ciphertext נחשף במידי

**מתי מתבצע:**
- כל פעם שlocal field נכתב ל-Supabase דרך `saveEncrypted()`
- decrypt בכל קריאה דרך `loadEncryptedKey()` (parallel)

### Server-Side Encryption (🔒) — Supabase

**אלגוריתם:** AES-256-XTS (default of PostgreSQL on disk)
**בנפרד מ-Client-side**, מספק שכבת הגנה נוספת אם DB נגרר.

### Row-Level Security (📦) — Supabase

**מנגנון:**
- RLS policies מוגדרות פר-table
- כל query עובר דרך filter שמסתמך על `auth.uid()` ו-`public.is_owner()` (SECURITY DEFINER function)
- Developer role **חסום מ-DB level** מקריאת PHI keys

---

## תיק לקוח טיפוסי — דוגמה לתפרסות PII

לקוח "ד.כ" (שם בדוי) שמתחיל טיפול:

| איפה נמצא מידע | מה |
|---|---|
| `argaman_leads` (לפני המרה) | שם ראשי, טלפון, מקור, נושא |
| `argaman_clients` (אחרי המרה) | פרטים מלאים, סטטוס, היסטוריית הערות |
| `argaman_sessions` | תאריך + שעה + רשומה SOAP פר-פגישה |
| `argaman_outcomes` | ציון PHQ-9 פר-פגישה |
| `argaman_risk_assessments` | ציון C-SSRS אם רלוונטי |
| `argaman_treatment_plans` | יעדי טיפול + התערבויות |
| `argaman_consents` | חתימת הסכמה + chain hash |
| `argaman_action_log` | כל פעולה — "גל יצר לקוח", "גל עדכן SOAP", וכו' |
| `argaman_login_history` | כניסות של גל לCRM כשעבד על הלקוח (לא הלקוח מתחבר) |

**כמות המידע על לקוח אחד אחרי שנת טיפול:**
- ~50 פגישות × ~5KB SOAP = ~250KB
- ~50 outcomes × 1KB = ~50KB
- ~5 risk assessments × 2KB = ~10KB
- ~1 consent (canvas) = ~30KB
- ~100 audit entries = ~10KB
- **סה"כ: ~350KB מוצפן** per active client

---

## משך שמירה — מטריקס

| סוג מידע | שמירה אחרי סיום טיפול |
|---|---|
| Clients, Sessions, SOAP, Outcomes, Risk | **7 שנים** (הוראת רישוי) |
| Voice Recordings | 30 יום אחרי סיום (אלא אם נדרש אחרת) |
| Treatment Plans | 7 שנים |
| Consents | לעולם (ראיה משפטית) |
| Leads (לא הומרו) | 12 חודש |
| Audit Log | 24 חודש |
| Login History | 12 חודש |
| Error Log | 6 חודש |

---

## גישה לפי תפקיד

| תפקיד | נתונים נראים |
|---|---|
| **Owner (גל)** | הכל. PHI + ניהול משתמשים + audit log מלא |
| **Staff** | PHI מלא, ללא ניהול משתמשים |
| **Developer (רועי)** | **רק נתונים פומביים**: מאמרים, סדנאות, מחירים, FAQ, הגדרות, מטא-נתוני audit (בלי entity_label) |
| **Anon** | רק `argaman_article_overrides` + `argaman_faq_overrides` (לתמוך באתר ציבורי) |

---

## תיעוד עדכונים

| גרסה | תאריך | שינוי | מבצע |
|---|---|---|---|
| 1.0 | 2026-05-19 | מסמך ראשוני | רועי ממן |

---

**מסמך זה הוא חלק מ-DPIA + ROPA. עדכון נדרש בכל שינוי במבנה הנתונים.**
