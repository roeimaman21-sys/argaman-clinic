# 🚨 Breach Response Runbook — קליניקת ארגמן

**מסמך פעולה במקרה של אירוע אבטחה — תיקון 13 לחוק הגנת הפרטיות**

**גרסה:** 1.0 · **תאריך:** 2026-05-19 · **בעלים:** גל ממן

---

## ⚠️ שלבים — בכל אירוע

### שלב 1: **Containment** (תוך 1 שעה)

**מטרה:** עצירת ההמשך של האירוע.

- [ ] **זיהוי איזה משאב נחשף:**
  - חשבון Gal (Supabase Auth)?
  - חשבון רועי (Developer role)?
  - אתר ציבורי (argamanclinic.com)?
  - CRM (admin.html)?
  - מכשיר פיזי (Mac, iPhone, USB)?

- [ ] **שינוי credentials מיידי:**
  - אם Auth compromise: Supabase Dashboard → Auth → Users → Reset Password
  - אם service_role compromise: Supabase Settings → API → Regenerate Service Role Key
  - אם laptop compromise: revoke all active sessions (Supabase → Auth → Logs → Revoke)
  - אם API key compromise: rotate ב-Netlify Environment Variables

- [ ] **חסימת IP זר (אם רלוונטי):**
  - Netlify Dashboard → Site Settings → Security → IP Allowlist

- [ ] **הקפאת CRM (אם דליפה רחבה):**
  - Temporary: בטל את argaman_users של החשבון המסומן
  - Or: `ALTER TABLE argaman_data DISABLE TRIGGER ALL;` (קיצוני)

- [ ] **תיעוד ראשוני:**
  - מי, מה, מתי, איפה
  - יצירת ticket ב-error_log עם source='breach'

### שלב 2: **Scope Assessment** (תוך 12 שעות)

**מטרה:** הבנת היקף — כמה לקוחות, איזה נתונים, מי גישה.

- [ ] **בדיקת audit log:**
  - איזה records נקראו/שונו/נמחקו
  - מאיזה IP / fingerprint
  - אילו לקוחות מושפעים

- [ ] **בדיקת error log:**
  - שגיאות חריגות בזמן הרלוונטי

- [ ] **בדיקת Supabase logs:**
  - Dashboard → Logs → API + Auth
  - חיפוש queries חריגות

- [ ] **קביעת severity (לפי matrix):**
  - L1 Critical: PHI דלף לציבור (>1 לקוח)
  - L2 High: גישה לא-מורשית זוהתה, אבל לא דליפה ציבורית
  - L3 Medium: פעילות חשודה ללא חשיפה
  - L4 Low: anomaly within threshold

- [ ] **רשימת מושפעים:**
  - שמות + טלפון + סוג נתון שדלף
  - שמירת רשימה ב-VOLT (Bitwarden / 1Password) — לא בכתב פתוח

### שלב 3: **Regulatory Reporting** (תוך 72 שעות מהזיהוי)

**חובה לפי תיקון 13 (אם L1 או L2):**

- [ ] **דיווח לרשות להגנת הפרטיות:**
  - אתר: https://www.gov.il/he/departments/the_privacy_protection_authority
  - מייל: privacy@justice.gov.il
  - כולל: תיאור האירוע, תאריך, היקף, נתונים שדלפו, פעולות שננקטו

- [ ] **תוכן הדיווח:**
  ```
  לכבוד הרשות להגנת הפרטיות,

  בהתאם לסעיף 11ב לחוק הגנת הפרטיות, אנו מדווחים על אירוע אבטחה:

  גוף: קליניקת ארגמן
  מספר עוסק: [VAT]
  בעלים: גל ממן
  טלפון: 050-6415222

  תאריך אירוע: [DATE]
  תאריך זיהוי: [DATE]
  סוג אירוע: [phishing / insider / external attack / accidental]
  היקף: [N לקוחות מושפעים]
  סוג נתונים: [PHI / contact info / financial / ...]

  פעולות שננקטו:
  1. [Containment]
  2. [Scope assessment]
  3. [Notification to affected]

  אמצעי אבטחה במקום:
  - AES-256-GCM encryption
  - Supabase RLS
  - Multi-factor authentication (WebAuthn Passkeys)
  - Merkle-chained audit logs

  נשמח לפרטים נוספים בטלפון.
  ```

- [ ] **שמירת קבלת תיוק** (מספר פנייה)

### שלב 4: **Client Notification** (תוך 72 שעות אם high-risk)

**מתי מודיעים ללקוחות?**
- L1 Critical: תמיד
- L2 High: אם דליפה הגיעה לצד שלישי (לא רק לידיעת תוקף)
- L3 Medium: לא מודיעים אלא אם רגולטור מורה
- L4 Low: לא מודיעים

**איך מודיעים:**
- WhatsApp + email (ערוץ קבוע של גל ולקוח)
- שיחת טלפון אישית למקרים L1

**תוכן ההודעה:**
```
היי [שם],

חובתי לדווח לך על אירוע אבטחה שקרה ב-[DATE]:

מה קרה: [תיאור פשוט, ללא לשון משפטית]
איזה נתונים שלך מושפעים: [SOAP / טלפון / מייל / וכו']
מה אתה צריך לעשות: [שום דבר / להחליף סיסמה / להיזהר מ-phishing]
מה אני עושה: [רשימת פעולות מיידיות]

אני זמינה לכל שאלה ב-050-6415222.

מצטערת על הקרבת לפרטיות. אני מבטיחה שאני לוקחת את זה ברצינות מלאה.

גל
```

### שלב 5: **Post-Mortem** (תוך 1-4 שבועות)

- [ ] **כתיבת מסמך post-mortem:**
  - מה קרה (timeline)
  - שורש הבעיה (5 whys)
  - מה עבד טוב
  - מה לא עבד
  - שיפורים שיתבצעו

- [ ] **עדכון תוכניות אבטחה:**
  - DPIA אם רלוונטי
  - ROPA אם רלוונטי
  - Threat model

- [ ] **עדכון runbook זה** אם פערים זוהו

- [ ] **table-top exercise** של התרחיש שקרה — עם רועי

---

## 🎭 4 תרחישי תרגיל (לסימולציה רבעונית)

### תרחיש 1: Phishing — חשבון של גל נגנב
- ערב: גל קיבלה מייל "Supabase: please verify your account" → לחצה → הקלידה סיסמה
- 03:00 בלילה: התראה אוטומטית מ-anomaly trigger ("login from Estonia")
- **תרגיל:** הלכו על שלבים 1-5 עם זה

### תרחיש 2: Insider — רועי גישה ל-canary
- בוקר: גל מקבלת email "🚨 canary record accessed by user_id=roi"
- **תרגיל:** איך מתמודדים בלי לעורר עימות?

### תרחיש 3: Lost Laptop
- אובדן Mac עם CRM פתוח. אין יודעים אם session active.
- **תרגיל:** quick revoke + assess damage + replace device

### תרחיש 4: Ransomware
- USB עם backups זוהם → encrypted → unreadable
- **תרגיל:** recovery from Shamir shares / cloud backups / Supabase native backup

---

## 📞 אנשי קשר חירום

| תפקיד | שם | טלפון | מייל |
|---|---|---|---|
| בעלים | גל ממן | 050-6415222 | argamanclinic@gmail.com |
| מפתח | רועי ממן | [N/A here] | roeimaman21@gmail.com |
| יועץ משפטי | [להוסיף] | [להוסיף] | [להוסיף] |
| רשות להגנת הפרטיות | — | 02-6549400 | privacy@justice.gov.il |
| Supabase support | — | — | support@supabase.com |
| Netlify support | — | — | support@netlify.com |

---

## 🔐 Severity Matrix

| Level | הגדרה | זמן תגובה | יעדים | דיווח לרשות? |
|---|---|---|---|---|
| **L1 Critical** | PHI דלף לציבור או לצד שלישי לא מורשה | < 2h | containment + reporting + notification | חובה |
| **L2 High** | גישה לא-מורשית זוהתה, ייתכן דליפה | < 24h | scope assessment + decision | רובן הסיכויים |
| **L3 Medium** | פעילות חשודה, ללא הוכחת חשיפה | < 72h | investigation + monitoring | תלוי |
| **L4 Low** | anomaly within rules thresholds | < 1 week | log + review | לא |

---

## ✅ Checklist להדפסה (שמור בכספת)

1. [ ] זוהיתי את האירוע
2. [ ] קבעתי severity (L1/L2/L3/L4)
3. [ ] שיניתי credentials הרלוונטיים
4. [ ] הקפאתי משאבים מסוכנים (אם רלוונטי)
5. [ ] תיעדתי את האירוע ב-error_log
6. [ ] חישבתי scope (כמה לקוחות, מה דלף)
7. [ ] אם L1/L2 — דיווחתי לרשות תוך 72h
8. [ ] אם high-risk — הודעתי ללקוחות תוך 72h
9. [ ] כתבתי post-mortem תוך שבועיים
10. [ ] עדכנתי runbook זה אם פערים

---

**הערה:** מסמך זה מתעדכן רבעונית. גרסה אחרונה זמינה ב-GitHub repo + מודפס בכספת המשרד.
