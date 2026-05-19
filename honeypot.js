/* =====================================================
   honeypot.js — Canary records for insider detection
   Detects when developer/staff role accesses fake PHI records.
   ===================================================== */
(function(){
  'use strict';

  // Honeypot client data (looks real but is fake)
  const HONEYPOTS = [
    {
      id: 'ZZZ-CANARY-001',
      name: 'ZZZ-DO-NOT-ACCESS-CANARY',
      phone: '0500000001',
      email: 'canary@argaman.honeypot',
      status: 'active',
      tags: ['__honeypot__'],
      notes: [{ date: '2026-01-01T00:00:00.000Z', text: 'CANARY RECORD — ANY ACCESS = INSIDER ALERT' }]
    }
  ];

  /** Inject honeypots into State.clients (memory only, never saved) */
  function inject(){
    if (!window.State) return;
    if (!Array.isArray(window.State.clients)) return;
    HONEYPOTS.forEach(hp => {
      if (!window.State.clients.find(c => c.id === hp.id)) {
        window.State.clients.push(hp);
      }
    });
  }

  /** Check if a client ID is a honeypot */
  function isHoneypot(clientId){
    return HONEYPOTS.some(hp => hp.id === clientId);
  }

  /** Report access to honeypot */
  async function reportAccess(honeypotId, action){
    if (!window.supa) return;
    try {
      const { data: userData } = await window.supa.auth.getUser();
      const user = userData?.user;
      // Skip if it's the owner (they may legitimately browse)
      const role = window.CURRENT_USER_ROLE;
      if (role === 'owner') return;

      // Log to DB
      await window.supa.from('argaman_honeypot_access').insert({
        honeypot_id: honeypotId,
        user_id: user?.id || null,
        user_email: user?.email || null,
        action,
        user_agent: (navigator.userAgent || '').slice(0, 300)
      });

      // Alert owner via FormSubmit
      await fetch('https://formsubmit.co/ajax/argamanclinic@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: '🚨 HONEYPOT ALERT — אזעקת אבטחה',
          message: `אזהרה: מישהו שאינו בעלים ניגש לרשומת canary.

משתמש: ${user?.email || 'לא ידוע'}
תפקיד: ${role || 'לא ידוע'}
פעולה: ${action}
זמן: ${new Date().toLocaleString('he-IL')}

זה עלול להיות:
1. רועי שמשחק עם המערכת — בדוק איתו
2. חשבון פרוץ — חובה לשנות סיסמאות מיד
3. בעיה ב-RLS — חובה לבדוק את ההגדרות

בכל מקרה: שווה לבדוק.`,
          _captcha: 'false'
        })
      });
    } catch(e){
      console.warn('[Honeypot] report failed:', e.message);
    }
  }

  /** Wrap viewClient + editSession + similar to detect access */
  function hookViewClient(){
    const original = window.viewClient;
    if (!original) return;
    window.viewClient = function(id){
      if (isHoneypot(id)){
        reportAccess(id, 'read').catch(()=>{});
      }
      return original.apply(this, arguments);
    };
  }

  // Init: inject honeypots after State loads
  document.addEventListener('DOMContentLoaded', () => {
    const tryInject = setInterval(() => {
      if (window.State?.clients){
        clearInterval(tryInject);
        inject();
        setTimeout(hookViewClient, 3000); // after admin.html defines viewClient
      }
    }, 500);
  });

  window.Honeypot = { inject, isHoneypot, reportAccess };
})();
