/* =====================================================
   cookie-consent.js — GDPR/תיקון 13 compliant consent banner
   ─────────────────────────────────────────────────────
   Public site only — gates GA4 + Clarity behind explicit opt-in.
   Stores choice in localStorage. Version-aware (re-asks on policy change).
   ===================================================== */
(function(){
  'use strict';
  if (location.pathname.endsWith('/admin.html')) return; // CRM doesn't show banner

  const VERSION = '1.0';
  const STORAGE_KEY = 'argaman_cookie_consent';
  const POLICY_URL = '/privacy.html';

  function getStoredConsent(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION) return null; // policy changed → re-ask
      return parsed;
    } catch(_) { return null; }
  }

  function saveConsent(decision){
    const record = {
      version: VERSION,
      analytics: !!decision.analytics,
      marketing: !!decision.marketing,
      decidedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent('argaman:consent', { detail: record }));
    return record;
  }

  function injectStyles(){
    if (document.getElementById('argaman-cc-styles')) return;
    const style = document.createElement('style');
    style.id = 'argaman-cc-styles';
    style.textContent = `
      #argaman-cc-banner{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:3px solid #C9A84C;box-shadow:0 -4px 20px rgba(0,0,0,.12);z-index:9998;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;font-family:Heebo,system-ui,sans-serif;direction:rtl}
      #argaman-cc-banner .cc-text{flex:1 1 280px;font-size:.88rem;color:#1a1a2e;line-height:1.5}
      #argaman-cc-banner .cc-text a{color:#1B3A6B;text-decoration:underline;font-weight:600}
      #argaman-cc-banner .cc-actions{display:flex;gap:.5rem;flex-wrap:wrap}
      #argaman-cc-banner button{padding:.55rem 1rem;border-radius:6px;font-size:.85rem;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all .2s}
      #argaman-cc-banner .cc-accept{background:#C9A84C;color:#1a1a1a}
      #argaman-cc-banner .cc-accept:hover{background:#a8882e}
      #argaman-cc-banner .cc-essential{background:#f3f4f6;color:#374151}
      #argaman-cc-banner .cc-essential:hover{background:#e5e7eb}
      #argaman-cc-banner .cc-details{background:transparent;color:#6b7280;text-decoration:underline}
      #argaman-cc-modal{position:fixed;inset:0;background:rgba(15,35,71,.5);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;direction:rtl;font-family:Heebo,system-ui,sans-serif}
      #argaman-cc-modal .cc-modal-body{background:#fff;max-width:560px;width:100%;border-radius:12px;padding:1.5rem;max-height:85vh;overflow-y:auto}
      #argaman-cc-modal h2{color:#1B3A6B;margin-bottom:.5rem;font-size:1.2rem}
      #argaman-cc-modal p{color:#4b5563;font-size:.88rem;line-height:1.6;margin-bottom:.75rem}
      #argaman-cc-modal .cc-toggle{display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:#f9fafb;border-radius:8px;margin-bottom:.5rem}
      #argaman-cc-modal .cc-toggle strong{color:#1B3A6B}
      #argaman-cc-modal .cc-toggle small{display:block;color:#6b7280;font-size:.78rem;margin-top:.2rem}
      #argaman-cc-modal .cc-toggle input[type="checkbox"]{width:42px;height:24px;cursor:pointer}
      #argaman-cc-modal .cc-toggle input[disabled]{opacity:.5;cursor:not-allowed}
      #argaman-cc-modal .cc-modal-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem}
      @media (max-width:560px){#argaman-cc-banner{flex-direction:column;align-items:stretch}#argaman-cc-banner .cc-actions{justify-content:stretch}#argaman-cc-banner .cc-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function renderBanner(){
    injectStyles();
    const banner = document.createElement('div');
    banner.id = 'argaman-cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'cc-banner-text');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <div class="cc-text" id="cc-banner-text">
        🍪 אנו משתמשים ב-cookies לאנליטיקה לשיפור האתר. אישור מאפשר לנו להבין איך מבקרים משתמשים. <a href="${POLICY_URL}">פרטים</a>
      </div>
      <div class="cc-actions">
        <button class="cc-details" type="button" id="cc-details-btn">פירוט והתאמה</button>
        <button class="cc-essential" type="button" id="cc-essential-btn">רק חיוני</button>
        <button class="cc-accept" type="button" id="cc-accept-btn">אישור מלא</button>
      </div>
    `;
    document.body.appendChild(banner);
    document.getElementById('cc-accept-btn').addEventListener('click', () => {
      saveConsent({ analytics: true, marketing: true });
      banner.remove();
      loadAnalytics();
    });
    document.getElementById('cc-essential-btn').addEventListener('click', () => {
      saveConsent({ analytics: false, marketing: false });
      banner.remove();
    });
    document.getElementById('cc-details-btn').addEventListener('click', () => {
      banner.remove();
      renderModal();
    });
  }

  function renderModal(initial){
    injectStyles();
    const consent = initial || getStoredConsent() || { analytics: false, marketing: false };
    const modal = document.createElement('div');
    modal.id = 'argaman-cc-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cc-modal-title');
    modal.innerHTML = `
      <div class="cc-modal-body">
        <h2 id="cc-modal-title">הגדרות פרטיות</h2>
        <p>בקליניקת ארגמן אנו מכבדים את הפרטיות שלך לפי <strong>תיקון 13 לחוק הגנת הפרטיות</strong>. בחר אילו cookies לאפשר:</p>

        <div class="cc-toggle">
          <div><strong>🛡️ חיוני (תמיד פעיל)</strong><small>הפעלת האתר, אבטחה, העדפות שפה</small></div>
          <input type="checkbox" checked disabled aria-label="חיוני (תמיד פעיל)">
        </div>

        <div class="cc-toggle">
          <div><strong>📊 אנליטיקה</strong><small>Google Analytics + Microsoft Clarity (anonymized) — להבין שימוש באתר</small></div>
          <input type="checkbox" id="cc-analytics" ${consent.analytics?'checked':''} aria-label="אנליטיקה">
        </div>

        <div class="cc-toggle">
          <div><strong>📣 שיווק</strong><small>פיקסלים של פייסבוק / גוגל ads (לא בשימוש כיום)</small></div>
          <input type="checkbox" id="cc-marketing" ${consent.marketing?'checked':''} aria-label="שיווק">
        </div>

        <p style="font-size:.78rem;color:#6b7280;margin-top:1rem">תוכל לשנות בכל עת בעמוד <a href="${POLICY_URL}" style="color:#1B3A6B">מדיניות פרטיות</a>.</p>

        <div class="cc-modal-actions">
          <button class="cc-essential" type="button" id="cc-cancel-btn">ביטול</button>
          <button class="cc-accept" type="button" id="cc-save-btn">שמור הגדרות</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const firstFocusable = modal.querySelector('input:not([disabled])');
    if (firstFocusable) firstFocusable.focus();

    document.getElementById('cc-save-btn').addEventListener('click', () => {
      const analytics = document.getElementById('cc-analytics').checked;
      const marketing = document.getElementById('cc-marketing').checked;
      saveConsent({ analytics, marketing });
      modal.remove();
      if (analytics) loadAnalytics();
    });
    document.getElementById('cc-cancel-btn').addEventListener('click', () => {
      modal.remove();
      if (!getStoredConsent()) renderBanner();
    });
    // Esc to close
    const escHandler = (e) => {
      if (e.key === 'Escape'){ modal.remove(); document.removeEventListener('keydown', escHandler); if (!getStoredConsent()) renderBanner(); }
    };
    document.addEventListener('keydown', escHandler);
  }

  /** Load GA4 + Clarity with differential privacy settings */
  function loadAnalytics(){
    const consent = getStoredConsent();
    if (!consent?.analytics) return;
    if (window.__argaman_analytics_loaded) return;
    window.__argaman_analytics_loaded = true;

    // GA4 with anonymization
    const GA_ID = 'G-QCQRJBKEY7';
    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s1);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, {
      anonymize_ip: true,
      allow_ad_personalization_signals: false,
      restricted_data_processing: true
    });
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted'
    });

    // Microsoft Clarity with mask mode
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      const y2=l.getElementsByTagName(r)[0];y2.parentNode.insertBefore(t,y2);
    })(window, document, "clarity", "script", "rqjsubgaek");
    if (window.clarity){
      window.clarity('set', 'sensitive', 'masked');
    }
  }

  /** Public API */
  window.ArgamanConsent = {
    get: getStoredConsent,
    open: () => renderModal(),
    reset: () => { localStorage.removeItem(STORAGE_KEY); location.reload(); }
  };

  // Initialize on DOMContentLoaded
  function init(){
    const existing = getStoredConsent();
    if (existing) {
      if (existing.analytics) loadAnalytics();
      return; // no banner — user already decided
    }
    setTimeout(renderBanner, 800); // brief delay so banner doesn't flash
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
