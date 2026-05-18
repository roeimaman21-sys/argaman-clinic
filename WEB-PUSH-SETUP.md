# Web Push + WhatsApp Webhook — מדריך הקמה

## שלב 1: הרצת SQL ב-Supabase

פתח `push-setup.sql` והרץ ב-SQL Editor.

## שלב 2: התקנת Supabase CLI (פעם אחת)

```bash
npm install -g supabase
```

## שלב 3: התחברות ולינק לפרויקט

```bash
supabase login
supabase link --project-ref rrvjiudtgooyxpbboary
```

## שלב 4: Web Push — הגדרת secrets

VAPID keys כבר נוצרו במערכת:
- **Public Key**: `BP_yIPPPk5PQKXoPWo9oVU_KHRj9sx-sQi5KPGWMhwuYEGefL98jez6vouuF4DzU4v9vo7Xl8ByHYLfrtr_V6uw`
- **Private Key**: ראה ב-`web-push.js` בקוד המקור (לא לפרסם!)

```bash
supabase secrets set VAPID_PUBLIC_KEY="BP_yIPPPk5PQ..."
supabase secrets set VAPID_PRIVATE_KEY="<private key here>"
supabase secrets set VAPID_SUBJECT="mailto:argamanclinic@gmail.com"
```

## שלב 5: דפלוי Edge Functions

```bash
supabase functions deploy send-push
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

## שלב 6: WhatsApp via Twilio (אופציונלי)

1. צור חשבון ב-https://twilio.com
2. הפעל WhatsApp Sandbox (חינם) או רכוש מספר WhatsApp Business
3. בהגדרות → "WHEN A MESSAGE COMES IN" הזן:
   ```
   https://rrvjiudtgooyxpbboary.functions.supabase.co/whatsapp-webhook
   ```
   Method: POST
4. לדוגמה — בדיקה:
   - שלח הודעת WhatsApp ל-Twilio Sandbox
   - תוך כמה שניות תקבל push notification + שורה ב-argaman_whatsapp_inbox

## שלב 7: שליחת push מה-CRM

```js
// בתוך admin.html — לדוגמה
await fetch('https://rrvjiudtgooyxpbboary.functions.supabase.co/send-push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer <anon-key>`
  },
  body: JSON.stringify({
    title: '🎯 ליד חדש',
    body: 'דנה כהן הגישה פנייה',
    url: '/admin.html?lead=123'
  })
});
```

## תקלות נפוצות

- **iOS Safari**: Web Push עובד רק מ-iOS 16.4+ ורק כש-PWA מותקנת על המסך הראשי
- **Permission denied**: המשתמש לחץ "חסום" — צריך להפעיל ידנית בהגדרות הדפדפן
- **Twilio rate limit**: Sandbox מוגבל ל-9 messages/24h — לפרודקשן צריך לרכוש מספר

## עלויות

- **Supabase Functions**: 500K invocations/month חינם
- **Twilio Sandbox**: חינם
- **Twilio Production**: $1/month למספר + $0.005/הודעה
- **Web Push**: חינם — שולח ישירות לדפדפן דרך FCM/APNS

## מתי לא להתעסק עם זה

- אם אתה לא רוצה להוסיף עוד service חיצוני — Web Push לבד עובד מצוין בלי Twilio
- WhatsApp Cloud API של Meta הוא יותר זול לסבילה גבוהה (אבל יותר מסובך להגדיר)
