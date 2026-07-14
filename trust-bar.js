/* =====================================================
   trust-bar.js — Dismiss + auto-return logic (A4.1)
   Injects the bar at the very top of <body>, before the
   header. Hidden if user dismissed within 30 days.
   ===================================================== */
(function(){
  'use strict';

  const KEY = 'argaman_trust_bar_dismissed_at';
  const RETURN_AFTER_DAYS = 30;

  function isDismissed(){
    try {
      const ts = parseInt(localStorage.getItem(KEY) || '0', 10);
      if (!ts) return false;
      const days = (Date.now() - ts) / 86400000;
      return days < RETURN_AFTER_DAYS;
    } catch(_) { return false; }
  }

  function dismiss(bar){
    try { localStorage.setItem(KEY, String(Date.now())); } catch(_) {}
    bar.style.transition = 'transform 280ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease';
    bar.style.transformOrigin = 'top';
    bar.style.transform = 'scaleY(0)';
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.classList.add('is-hidden');
      document.body.classList.remove('has-trust-bar'); // restore navbar to top:0
    }, 320);
  }

  function build(){
    const bar = document.createElement('aside');
    bar.className = 'trust-bar';
    bar.setAttribute('role', 'complementary');
    bar.setAttribute('aria-label', 'אמינות ומידע מקצועי');
    bar.innerHTML = `
      <div class="trust-bar-inner">
        <div class="trust-bar-items">
          <span class="trust-bar-item">
            <span class="trust-bar-icon" aria-hidden="true">⭐</span>
            <strong>10</strong>
            <span>שנות ניסיון</span>
          </span>
          <span class="trust-bar-sep" aria-hidden="true">·</span>
          <span class="trust-bar-item">
            <span class="trust-bar-icon" aria-hidden="true">🎓</span>
            <strong>13</strong>
            <span>הסמכות מקצועיות</span>
          </span>
          <span class="trust-bar-sep" aria-hidden="true">·</span>
          <span class="trust-bar-item is-secondary">
            <span class="trust-bar-icon" aria-hidden="true">🛡️</span>
            <span>סודיות מוחלטת</span>
          </span>
          <span class="trust-bar-sep is-secondary" aria-hidden="true">·</span>
          <span class="trust-bar-item is-secondary">
            <span class="trust-bar-icon" aria-hidden="true">⚡</span>
            <span>מענה תוך שעה</span>
          </span>
        </div>
        <button class="trust-bar-close" type="button" aria-label="סגור הודעה זו">×</button>
      </div>
    `;
    bar.querySelector('.trust-bar-close').addEventListener('click', () => dismiss(bar));
    return bar;
  }

  function init(){
    if (isDismissed()) return;
    if (document.querySelector('.trust-bar')) return; // idempotent

    const bar = build();
    // Insert at very top of body so it sits above the fixed navbar
    document.body.insertBefore(bar, document.body.firstChild);
    // Tell CSS the bar is present → navbar shifts down, hero padding compensates
    document.body.classList.add('has-trust-bar');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
