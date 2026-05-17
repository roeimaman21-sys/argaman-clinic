/* =====================================================
   consent.js — Cookie Consent + Conditional GA4
   קליניקת ארגמן
   ===================================================== */
(function () {
  'use strict';

  var CONSENT_KEY = 'argaman_consent';
  var GA_ID       = 'G-QCQRJBKEY7'; // Google Analytics — קליניקת ארגמן

  /* ---- helpers ---- */
  function getConsent()      { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } }
  function setConsent(level) { try { localStorage.setItem(CONSENT_KEY, level); } catch {} }

  /* ---- activate GA4 (only after consent) ---- */
  function activateGA() {
    if (!GA_ID || GA_ID === 'G-XXXXXXXXXX') return; // not configured yet
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage:      'granted',
        ad_storage:             'denied',
        functionality_storage:  'granted',
        personalization_storage:'denied',
        security_storage:       'granted'
      });
    }
  }

  /* ---- deny GA4 ---- */
  function denyGA() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage:      'denied',
        ad_storage:             'denied',
        functionality_storage:  'denied',
        personalization_storage:'denied',
        security_storage:       'granted'
      });
    }
    // Delete any existing GA cookies
    var cookies = document.cookie.split(';');
    cookies.forEach(function(c) {
      var name = c.trim().split('=')[0];
      if (/^_ga/.test(name)) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + location.hostname;
      }
    });
  }

  /* ---- remove banner ---- */
  function hideBanner() {
    var b = document.getElementById('argaman-cookie-banner');
    if (b) {
      b.style.transform = 'translateY(120%)';
      setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
    }
  }

  /* ---- public handlers (used by onclick) ---- */
  window.__consentAcceptAll = function () {
    setConsent('all');
    activateGA();
    if (typeof activateClarity === 'function') activateClarity();
    hideBanner();
  };

  window.__consentEssential = function () {
    setConsent('essential');
    denyGA();
    hideBanner();
  };

  /* ---- inject banner HTML ---- */
  function showBanner() {
    if (document.getElementById('argaman-cookie-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'argaman-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'הסכמה לשימוש בעוגיות');
    banner.innerHTML =
      '<div class="cookie-inner">' +
        '<div class="cookie-text">' +
          '<strong>🍪 שימוש בעוגיות</strong>' +
          '<p>אנו משתמשים בעוגיות הכרחיות לפעילות האתר, ובעוגיות ניתוח (Google Analytics) לשיפור השירות. ' +
          'לא משתמשים בעוגיות פרסום. <a href="privacy.html">מדיניות פרטיות ←</a></p>' +
        '</div>' +
        '<div class="cookie-actions">' +
          '<button class="cookie-btn-ess" onclick="__consentEssential()">רק הכרחיות</button>' +
          '<button class="cookie-btn-all" onclick="__consentAcceptAll()">קבל הכל ✓</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    // Animate in
    setTimeout(function() { banner.classList.add('cookie-visible'); }, 80);
  }

  /* ---- init ---- */
  function init() {
    var consent = getConsent();
    if (consent === 'all') {
      activateGA();
      if (typeof activateClarity === 'function') activateClarity();
    } else if (consent === 'essential') {
      denyGA();
    } else {
      // No consent yet — show banner, default deny
      denyGA();
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* Microsoft Clarity placeholder — Gal activates by replacing PROJECT_ID */
/* Clarity is free, requires consent. Activate by:
   1. Sign up at https://clarity.microsoft.com
   2. Get project ID
   3. Replace 'CLARITY_PROJECT_ID' below
*/
function activateClarity(){
  const CLARITY_ID = 'wsgmcd4l6j'; // SET YOUR ID HERE
  if (!CLARITY_ID || CLARITY_ID === 'CLARITY_PROJECT_ID') return;
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    const y2=l.getElementsByTagName(r)[0];y2.parentNode.insertBefore(t,y2);
  })(window,document,'clarity','script',CLARITY_ID);
}
