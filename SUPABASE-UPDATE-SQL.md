# 🔄 SQL לעדכון Supabase — להפעלת עריכת מאמרים

## למה צריך את זה?
לאחר הפעלת RLS, אנונימי לא יכול לקרוא מ-Supabase. אבל אנחנו רוצים שעריכת מאמרים תופיע באתר — אז צריך לאפשר קריאה אנונימית **רק** למפתחות הציבוריים: `article_overrides` ו-`faq_overrides`.

## הSQL להריץ:

פתח את **https://supabase.com/dashboard/project/rrvjiudtgooyxpbboary/sql/new** והדבק:

```sql
-- מחיקת מדיניות ישנה (אם קיימת)
DROP POLICY IF EXISTS "Public read overrides" ON public.argaman_data;

-- אפשור קריאה אנונימית למפתחות ציבוריים בלבד
CREATE POLICY "Public read overrides"
  ON public.argaman_data
  FOR SELECT TO anon
  USING (key IN ('article_overrides', 'faq_overrides'));

-- אימות
SELECT policyname, cmd, roles, qual::text
FROM pg_policies
WHERE tablename='argaman_data'
ORDER BY policyname;
```

**RUN** (Ctrl+Enter)

תוצאה צפויה — 3 policies:
1. `Allow auth` — authenticated users full access
2. `Deny anon` — RESTRICTIVE
3. `Public read overrides` — anon SELECT on 2 keys only

## איך זה עובד?
- ה-`RESTRICTIVE` policy חוסם anon כברירת מחדל
- ה-`Public read overrides` הוא **PERMISSIVE** ומאפשר רק SELECT
- אבל מאחר ויש RESTRICTIVE שחוסם — Supabase מצרף את שניהם:
  - `Public read overrides` יכול לאשר רק כשהוא מסכים, **אבל ה-RESTRICTIVE חוסם תחילה**

**הפתרון הנכון:** להחליף את ה-RESTRICTIVE policy ל-PERMISSIVE עם מסנן ספציפי:

```sql
-- הסרת מדיניות RESTRICTIVE הישנה
DROP POLICY IF EXISTS "Deny anon" ON public.argaman_data;
DROP POLICY IF EXISTS "Public read overrides" ON public.argaman_data;

-- אנון יכול לקרוא רק overrides
CREATE POLICY "Anon read public keys"
  ON public.argaman_data
  FOR SELECT TO anon
  USING (key IN ('article_overrides', 'faq_overrides'));

-- אנון לא יכול לכתוב/לעדכן/למחוק
CREATE POLICY "Anon no write"
  ON public.argaman_data
  AS RESTRICTIVE
  FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Anon no update"
  ON public.argaman_data
  AS RESTRICTIVE
  FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Anon no delete"
  ON public.argaman_data
  AS RESTRICTIVE
  FOR DELETE TO anon USING (false);
```

**הריץ את הSQL הזה** ותגיד לי כשסיימת.
