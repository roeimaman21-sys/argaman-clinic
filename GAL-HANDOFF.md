# 📋 מסמך העברה לגל — קליניקת ארגמן
**עדכון אחרון:** 17 במאי 2026

---

## 🔴 פעולות חובה (אם לא בוצעו)

### 1. שינוי סיסמת CRM (5 דקות)
1. כניסה: **https://argamanclinic.com/admin.html**
2. סיסמה נוכחית: `argaman2025`
3. **מיד יתבקש שינוי סיסמה** — בחר סיסמה חזקה (16+ תווים)
4. **שמור במנהל סיסמאות** (Bitwarden, 1Password, Google Password Manager)

### 2. יצירת קוד שחזור (5 דקות)
לאחר שינוי הסיסמה:
1. בתפריט CRM → "**🔒 אבטחה ויומן**"
2. לחץ "**➕ הגדר קוד שחזור עכשיו**"
3. הזן את הסיסמה שלך
4. **הקוד יוצג פעם אחת בלבד**
5. שלח לעצמך:
   - 📧 לחץ "שלח במייל" (יישלח ל-argamanclinic@gmail.com)
   - 📲 לחץ "שלח ב-SMS" (יפתח אפליקציית SMS)
   - 📋 או העתק ושמור במנהל סיסמאות
6. אשר "שמרתי את הקוד" → סיום

**⚠️ ללא הקוד, אם תשכח סיסמה — כל הנתונים יאבדו!**

### 3. הגדרת Supabase RLS (10 דקות)
1. כניסה: **https://supabase.com/dashboard/project/rrvjiudtgooyxpbboary**
2. **Authentication → Users → Add user**
   - Email: `argamanclinic@gmail.com`
   - Password: סיסמה חזקה (אחרת מסיסמת ה-CRM!)
   - **Auto Confirm User: ✅ כן**
3. **SQL Editor → New Query** → הדבק:
```sql
ALTER TABLE public.argaman_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.argaman_data FORCE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename='argaman_data'
  LOOP EXECUTE format('DROP POLICY %I ON public.argaman_data', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Deny anon" ON public.argaman_data AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Allow auth" ON public.argaman_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

DELETE FROM public.argaman_data WHERE key = 'test_injection';
```
4. RUN
5. חזור ל-CRM, התחבר → יבקש credentials של Supabase → הזן את האימייל והסיסמה שיצרת

---

## 🟡 פעולות שיווק חיוניות

### 4. Google Search Console (15 דקות)
1. https://search.google.com/search-console
2. הוסף property: `argamanclinic.com`
3. אמת בעלות:
   - **Option A** (קל): DNS verification ב-Netlify
   - **Option B**: HTML file upload — תוריד קובץ, אעלה לאתר
4. הגש sitemap: `https://argamanclinic.com/sitemap.xml`
5. הגש image sitemap: `https://argamanclinic.com/sitemap-images.xml`

**זה הקריטי ביותר ל-SEO. בלי זה — Google לא יודע שהאתר קיים.**

### 5. Google Business Profile (30 דקות)
1. https://business.google.com
2. הוסף עסק:
   - שם: **קליניקת ארגמן**
   - קטגוריה: **יועץ נישואין** (Marriage Counselor)
   - כתובת: **דרך יצחק רבין 8, בית שמש**
   - טלפון: **050-641-5222**
   - אתר: **argamanclinic.com**
3. אמת (תקבל גלויה דרך הדואר תוך 2 שבועות)
4. השלם פרופיל: שעות, תמונות, שירותים
5. **חיוני ל-SEO מקומי** ("ייעוץ זוגי בית שמש")

### 6. Microsoft Clarity (5 דקות) — heatmap חינמי
1. https://clarity.microsoft.com → Sign in (Microsoft account)
2. צור פרויקט חדש: argamanclinic
3. העתק את Project ID
4. ערוך קובץ `consent.js` בשרת:
   - מצא: `const CLARITY_ID = '';`
   - החלף ל: `const CLARITY_ID = 'YOUR_ID_HERE';`
5. רענן את האתר → Clarity מתחיל להקליט sessions
6. תוך 2 שעות תראה heatmaps + session recordings

### 7. Bing Webmaster Tools (10 דקות)
1. https://www.bing.com/webmasters
2. Import from Google Search Console (אם עשית #4 קודם)
3. או הוסף ידנית + הגש sitemap

### 8. בקשת ביקורות Google (לאורך זמן)
- לאחר אישור Google Business Profile
- שלח לכל לקוח/ה אחרי תהליך מוצלח:
  - יש ב-CRM תבנית WhatsApp מוכנה: "🌟 בקשת ביקורת Google"

---

## 📝 תוכן לעדכן בעצמך

### 9. מחירים אמיתיים
**עמוד**: `pricing.html`
- כרגע יש "/* גל ימלא */"
- ערוך דרך CRM: **תפריט → מחירים**

### 10. מועדי סדנאות
**עמוד**: `workshops.html`
- כרגע "מועדים מתעדכנים"
- ערוך דרך CRM: **תפריט → סדנאות**

### 11. המלצות אמיתיות
**עמוד**: `testimonials.html`
- כרגע 9 המלצות placeholder
- ערוך דרך CRM: **תפריט → המלצות**
- אפשר להחליף, להוסיף, או למחוק

### 12. סרטוני YouTube
**עמוד**: `videos.html`
- כרגע 6 placeholders
- ערוך דרך CRM: **תפריט → סרטונים**
- הדבק קוד YouTube embed

---

## 💼 איך להשתמש ב-CRM

### כניסה יומיומית
1. https://argamanclinic.com/admin.html
2. הזן סיסמה → לחץ "כניסה מאובטחת"
3. הזן Supabase credentials (פעם ראשונה בלבד)

### פעולות נפוצות

#### הוספת ליד חדש
- דשבורד → "+ ליד מהיר" (או מקש `N`)

#### הוספת לקוח
- צד שמאל → לקוחות → "+ לקוח חדש"
- אפשר לתייג ב-12 תגים מובנים (חרדי/חילוני/VIP/וכו')

#### תזכורות יום-לפני
- דשבורד מציג: "⏰ X פגישות מחר דורשות תזכורת"
- לחיצה על כל פגישה → פותח וואטסאפ עם תבנית מוכנה
- כפתור "📱 שלח לכל" — שולח את כל התזכורות ברצף

#### חשבוניות PDF
- לקוחות → פתח לקוח → "📄 הוצא חשבונית"
- בחר פגישות → לחץ "הוצא חשבונית"
- חלון חדש יפתח → Save as PDF

#### ייצוא נתונים
- כל קטגוריה (לידים/לקוחות/פגישות) → "ייצוא CSV"
- אבטחה → "ייצוא גיבוי מוצפן" (פעם בשבוע מומלץ)

### קיצורי מקלדת (Power User)
- `Ctrl+K` — חיפוש כללי
- `1-9` — ניווט בין עמודים
- `N` — ליד חדש
- `Esc` — סגירה / ניקוי חיפוש
- `Shift+?` — עזרת קיצורים

---

## 🔒 חשוב לזכור על האבטחה

- ✅ **הסיסמה חזקה** ושמורה במנהל סיסמאות
- ✅ **קוד שחזור** שמור במייל + מנהל סיסמאות
- ✅ **Supabase RLS** מוגדר
- ✅ **גיבוי שבועי** דרך "ייצוא גיבוי מוצפן"
- ❌ **לעולם אל תשתף סיסמה/קוד שחזור** — גם לא איתי, גם לא עם תמיכה טכנית
- ❌ **אל תיכנס מ-WiFi ציבורי לא מוגן** (קפה, מלון)

### במקרה של אובדן סיסמה
1. במסך הכניסה לחץ "🔑 שכחתי סיסמה"
2. בחר "📝 יש לי קוד שחזור"
3. הזן את הקוד מהמייל/SMS שלך
4. הגדר סיסמה חדשה

---

## 📞 כשמשהו לא עובד

1. **רענן את הדף** (Ctrl+F5)
2. **בדוק בלוג ביקורת** — אבטחה → "📋 יומן ביקורת"
3. **נקה cache**: F12 → Application → Clear storage
4. **חזור ל-roi (המפתח)** — הוא יוכל לעזור

---

## 📊 KPIs לעקוב חודשית

| מדד | יעד 6 חודשים | איפה רואים |
|------|--------------|-----------|
| צפיות חודשיות | 5,000+ | Google Analytics |
| לידים חודשיים | 25-40 | CRM → דשבורד |
| המרת ליד→לקוח | 40%+ | CRM → דוחות |
| מיקום Google (10 מילים) | טופ 3 | Search Console |
| Backlinks | 20+ | Search Console |
| Google Reviews | 30+ ⭐ | Business Profile |

---

## 🛠️ קבצים חשובים באתר

| קובץ | תפקיד |
|------|--------|
| `index.html` | דף בית |
| `admin.html` | CRM (סודי!) |
| `sitemap.xml` | מפת אתר ל-Google |
| `sitemap-images.xml` | מפת תמונות |
| `rss.xml` | מאמרים אחרונים (RSS feed) |
| `robots.txt` | הנחיות ל-bots |
| `_headers` | אבטחה (CSP, HSTS) |
| `site.webmanifest` | PWA manifest |
| `sw.js` | Service Worker (PWA) |
| `crypto-utils.js` | מודול הצפנה |
| `style.css` | עיצוב |
| `script.js` | JS משותף |
| `consent.js` | Cookie consent + GA |

---

## 📖 מסמכים נוספים

- **SECURITY.md** — מדיניות אבטחה מלאה
- **terms.html** — תנאי שימוש
- **privacy.html** — מדיניות פרטיות
- **accessibility.html** — הצהרת נגישות

---

🎉 **בהצלחה! האתר מוכן ב-100% מבחינה טכנית. מכאן הכל בידיים שלך.**
