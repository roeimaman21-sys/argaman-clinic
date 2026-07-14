/* =====================================================
   share-buttons.js — Article share (A15.6)
   Native Web Share API on mobile; explicit icon buttons
   (WhatsApp/Facebook/X/copy-link) as universal fallback.
   ===================================================== */
(function(){
  'use strict';

  function shareNative(title, url){
    if (navigator.share){
      navigator.share({ title, url }).catch(() => {});
      return true;
    }
    return false;
  }

  function copyLink(url, btn){
    navigator.clipboard.writeText(url).then(() => {
      const original = btn.textContent;
      btn.textContent = 'הועתק ✓';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }).catch(() => {});
  }

  window.ArgamanShare = { shareNative, copyLink };

  document.addEventListener('click', (e) => {
    const nativeBtn = e.target.closest('[data-share-native]');
    if (nativeBtn){
      const title = document.title;
      const url = location.href;
      shareNative(title, url);
    }
    const copyBtn = e.target.closest('[data-share-copy]');
    if (copyBtn) copyLink(location.href, copyBtn);
  });

  // Show the native-share button only where the API is actually available
  // (otherwise it's a dead button on desktop browsers without support)
  document.addEventListener('DOMContentLoaded', () => {
    if (!navigator.share){
      document.querySelectorAll('[data-share-native]').forEach(el => el.style.display = 'none');
    }
  });
})();
