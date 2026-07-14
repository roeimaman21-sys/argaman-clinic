/* =====================================================
   motion.js — Reveal-on-scroll + ripple (A7)
   Lightweight, IntersectionObserver-based.
   ===================================================== */
(function(){
  'use strict';
  if (window.__argamanMotionInit) return;
  window.__argamanMotionInit = true;

  // ─── Reveal-on-scroll ───────────────────────────
  const reveals = () => document.querySelectorAll('.reveal:not(.is-visible)');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    const observeAll = () => reveals().forEach(el => obs.observe(el));
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeAll);
    } else {
      observeAll();
    }

    // Re-scan after any dynamic content loads (debounced)
    let scanTimer = null;
    const debounceScan = () => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(observeAll, 200);
    };
    window.argamanMotion = { rescan: debounceScan };
  } else {
    // Old browsers — show all immediately
    document.addEventListener('DOMContentLoaded', () => {
      reveals().forEach(el => el.classList.add('is-visible'));
    });
  }

  // ─── Touch ripple on .ripple elements ───────────
  function addRipple(el){
    el.classList.remove('is-rippling');
    // force reflow
    void el.offsetWidth;
    el.classList.add('is-rippling');
    setTimeout(() => el.classList.remove('is-rippling'), 650);
  }
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.ripple');
    if (t) addRipple(t);
  }, { passive: true });

  // ─── Haptic feedback on key actions (mobile only, silent no-op elsewhere) ───
  function haptic(intensity){
    if (!navigator.vibrate) return;
    const patterns = { light: 5, medium: 10, heavy: 20 };
    try { navigator.vibrate(patterns[intensity] || patterns.light); } catch(_) {}
  }
  window.ArgamanHaptic = { tap: () => haptic('light'), success: () => haptic('medium'), error: () => haptic('heavy') };

  // Light haptic on primary CTA taps (WhatsApp buttons, hero CTAs) — subtle, not on every link
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.btn-primary-cta, .btn-wa, .whatsapp-fab')) haptic('light');
  }, { passive: true });

  // Medium haptic on successful form submission (contact form dispatches this event)
  document.addEventListener('argaman:form-success', () => haptic('medium'));

  // ─── Smart sticky CTA bar — hide on scroll-down, show on scroll-up ───
  const stickyCta = document.querySelector('.mobile-sticky-cta');
  if (stickyCta) {
    let lastY = window.scrollY;
    let ticking = false;
    const SHOW_ABOVE_Y = 150; // never hide near the very top of the page

    function updateStickyCta(){
      const y = window.scrollY;
      const scrollingDown = y > lastY;
      if (y < SHOW_ABOVE_Y || !scrollingDown) {
        stickyCta.classList.remove('is-hidden-scroll');
      } else if (scrollingDown) {
        stickyCta.classList.add('is-hidden-scroll');
      }
      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateStickyCta);
        ticking = true;
      }
    }, { passive: true });
  }

})();
