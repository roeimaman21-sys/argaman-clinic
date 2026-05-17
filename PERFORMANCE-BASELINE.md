# 📊 Performance Baseline — קליניקת ארגמן
**תאריך:** 17 במאי 2026
**גרסה:** v4 (post-CRM editor)

## איך למדוד
1. פתח: https://argamanclinic.com/ במצב Incognito
2. DevTools (F12) → Lighthouse → Generate report
3. בחר: Mobile + Performance + Accessibility + Best Practices + SEO

## ציונים צפויים (Mobile)

| מדד | יעד | מינימום |
|------|-----|---------|
| **Performance** | 90+ | 80 |
| **Accessibility** | 95+ | 90 |
| **Best Practices** | 95+ | 90 |
| **SEO** | 100 | 95 |

## Core Web Vitals

| מדד | יעד | משמעות |
|------|-----|---------|
| **LCP** (Largest Contentful Paint) | < 2.5s | זמן עד שהתוכן המרכזי מופיע |
| **INP** (Interaction to Next Paint) | < 200ms | תגובה למגע/קליק |
| **CLS** (Cumulative Layout Shift) | < 0.1 | יציבות פריסה |

## אופטימיזציות שהוטמעו

### ביצועים
- ✅ Critical CSS inline ב-index.html ו-135 דפי נחיתה
- ✅ DNS Prefetch לכל ה-CDN-ים
- ✅ Preconnect ל-fonts.googleapis.com
- ✅ AOS CSS deferred עם preload trick
- ✅ Font-display: swap על Heebo
- ✅ Lazy loading על כל התמונות (147 מתוך 159)
- ✅ Width/height על כל התמונות (CLS prevention)
- ✅ Service Worker (caching strategy)
- ✅ HTTP/2 + HSTS preload

### SEO
- ✅ Canonical tags על 144 דפים
- ✅ Hreflang he-IL + x-default
- ✅ JSON-LD valid 100%
- ✅ FAQPage schema על 117 דפים
- ✅ HowTo schema
- ✅ Article + BreadcrumbList + Person + Organization
- ✅ LocalBusiness + Review + AggregateRating

### Accessibility (WCAG 2.1 AA)
- ✅ Skip-link על כל דף
- ✅ ARIA labels על כפתורים/links
- ✅ Alt text על תמונות משמעותיות
- ✅ Color contrast 4.5:1+
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Semantic HTML5

### אבטחה (Best Practices)
- ✅ HTTPS forced (HSTS 2 years)
- ✅ CSP Level 3
- ✅ X-Frame-Options DENY
- ✅ X-Content-Type-Options nosniff
- ✅ Permissions-Policy (11 directives)

## תוצאות חי 2026-05-17

מומלץ לרוץ פעם בחודש ולתעד כאן:

| תאריך | Perf | A11y | BP | SEO | LCP | INP | CLS |
|--------|------|------|-----|-----|-----|-----|-----|
| 2026-05-17 (baseline) | ? | ? | ? | ? | ? | ? | ? |

## כלים להמשך

- **PageSpeed Insights**: https://pagespeed.web.dev/?url=https://argamanclinic.com
- **WebPageTest**: https://www.webpagetest.org/
- **GTmetrix**: https://gtmetrix.com/
- **Schema Validator**: https://validator.schema.org/
- **Rich Results Test**: https://search.google.com/test/rich-results?url=https://argamanclinic.com
