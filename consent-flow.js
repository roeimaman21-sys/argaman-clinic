/* =====================================================
   consent-flow.js — Explicit Consent Collection
   תיקון 13 compliance · signature + hash chain
   ===================================================== */
(function(){
  'use strict';

  const CONSENT_TEXT_V1 = `
**הסכמת לקוח לטיפול ולעיבוד מידע — קליניקת ארגמן**

אני, החתום/ה מטה, מאשר/ת בזאת:

1. **קיבלתי הסבר** על מהות הטיפול הזוגי/אישי בקליניקת ארגמן, על תהליך הטיפול הצפוי ועל זכויותיי כלקוח/ה.

2. **אני מסכים/ה** שגל ממן (יועץ מוסמך) ינהל לי תיק טיפולי שכולל:
   - פרטי התקשרות (שם, טלפון, אימייל)
   - תיעוד פגישות (רשומות SOAP)
   - שאלוני התקדמות (PHQ-9, GAD-7 וכד')
   - הערכות סיכון במידת הצורך

3. **אבטחת המידע:** המידע יישמר במערכת **מוצפנת AES-256-GCM** עם הצפנה client-side. רק גל ממן (בעלים) יכול לראות את המידע.

4. **תקופת השמירה:** המידע יישמר למשך כל תקופת הטיפול ולמשך **7 שנים** לאחר סיום הטיפול (בהתאם להוראת רישוי משרד הבריאות).

5. **זכויותיי:** ידוע לי שאני רשאי/ת:
   - לעיין בכל המידע שמוחזק עליי
   - לבקש תיקון מידע שגוי
   - לבקש מחיקה (אחרי תום תקופת השמירה החוקית)
   - לבטל את ההסכמה הזו בכל עת (יחול מהיום והלאה)

6. **שיתוף עם צדדים שלישיים:** המידע **לא יישתף** עם צד שלישי **אלא אם:**
   - אני נותן/ת הסכמה מפורשת
   - חובה חוקית (לדוגמה, איום על חיים — דיווח לרשויות)
   - הליך משפטי שמחייב חשיפה

7. **גיבויים:** המידע מגובה תקופתית במערכת מוצפנת. גיבויים נמחקים אחרי 30 יום (חוץ מארכיון של 7 שנים).

8. **תיקון 13:** קראתי ואני מבין/ה את זכויותיי לפי תיקון 13 לחוק הגנת הפרטיות (תוקף 14.8.2025).

**הסכמתי החופשית, מודעת ומפורשת** היא יסוד החוזה הטיפולי בינינו.

---
גרסה: 1.0 · תאריך: 2026-05-19 · קליניקת ארגמן · גל ממן
`;

  /** Compute SHA-256 hash of a string (browser-compatible) */
  async function sha256(text){
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2,'0')).join('');
  }

  /** Get the previous consent's hash (for chaining) */
  async function getLastHash(){
    if (!window.supa) return null;
    const { data, error } = await window.supa
      .from('argaman_consents')
      .select('this_hash')
      .order('id', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0].this_hash;
  }

  /** Render the consent modal for a client */
  async function openConsentModal(clientId, clientName, clientPhone){
    if (!window.supa){ window.toast?.('Supabase לא זמין','error'); return; }
    const phoneLast4 = (clientPhone || '').replace(/[^0-9]/g,'').slice(-4);

    const html = `
      <div class="modal-content" style="max-width:700px">
        <h2 style="color:var(--navy);margin-bottom:.5rem;display:flex;align-items:center;gap:.5rem">📋 איסוף הסכמה — ${escapeHtml(clientName)}</h2>
        <div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:.6rem .9rem;border-radius:6px;font-size:.8rem;color:#78350f;margin-bottom:1rem">
          💡 הצג ללקוח את הטקסט, בקש לקרוא, בקש חתימה דיגיטלית, ושמור. ההסכמה תשמר עם hash chain לאי-שינוי.
        </div>
        <div style="max-height:280px;overflow-y:auto;background:#f9fafb;padding:1rem;border-radius:6px;font-size:.85rem;line-height:1.6;border:1px solid #e5e7eb">
          <pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(CONSENT_TEXT_V1)}</pre>
        </div>
        <label style="display:flex;align-items:center;gap:.5rem;margin:.75rem 0;font-size:.85rem">
          <input type="checkbox" id="consent-read"> הלקוח קרא וקיבל הסבר על הטקסט
        </label>
        <label style="display:block;font-weight:600;margin:.5rem 0 .3rem">חתימה דיגיטלית (להעביר אצבע / עכבר)</label>
        <canvas id="consent-canvas" width="600" height="120" style="width:100%;height:120px;border:2px dashed #C9A84C;border-radius:6px;background:#fff;touch-action:none"></canvas>
        <div style="display:flex;gap:.5rem;margin-top:.4rem">
          <button class="btn" onclick="window.clearConsentCanvas()" style="font-size:.8rem;padding:.3rem .7rem">🗑 נקה</button>
          <span style="font-size:.75rem;color:#6b7280;align-self:center">4 ספרות אחרונות של טלפון: ${escapeHtml(phoneLast4 || '—')}</span>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button class="btn" onclick="closeModal()">ביטול</button>
          <button class="btn btn-gold" id="consent-save-btn" onclick="window.saveConsent('${clientId}','${escapeAttr(clientName)}','${phoneLast4}')">שמור הסכמה</button>
        </div>
      </div>`;
    window.modal(html);
    setTimeout(setupCanvas, 100);
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escapeAttr(s){ return escapeHtml(s); }

  let _drawing = false;
  function setupCanvas(){
    const c = document.getElementById('consent-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1B3A6B';
    const getPos = (e) => {
      const rect = c.getBoundingClientRect();
      const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
      const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
      return { x: x * (c.width / rect.width), y: y * (c.height / rect.height) };
    };
    const start = (e) => { e.preventDefault(); _drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e) => { if (!_drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = () => { _drawing = false; };
    c.addEventListener('mousedown', start); c.addEventListener('mousemove', move); c.addEventListener('mouseup', end); c.addEventListener('mouseleave', end);
    c.addEventListener('touchstart', start); c.addEventListener('touchmove', move); c.addEventListener('touchend', end);
  }

  window.clearConsentCanvas = function(){
    const c = document.getElementById('consent-canvas');
    if (!c) return;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };

  /** Check if canvas has any drawing */
  function hasDrawing(canvas){
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4){
      if (data[i] !== 0) return true; // any non-transparent pixel
    }
    return false;
  }

  window.saveConsent = async function(clientId, clientName, phoneLast4){
    const c = document.getElementById('consent-canvas');
    const readCheckbox = document.getElementById('consent-read');
    if (!readCheckbox?.checked){ window.toast?.('יש לאשר שהלקוח קרא','error'); return; }
    if (!c || !hasDrawing(c)){ window.toast?.('יש לחתום על הקנבס','error'); return; }
    const btn = document.getElementById('consent-save-btn');
    btn.disabled = true; btn.textContent = 'שומר...';
    try {
      const signature = c.toDataURL('image/png');
      const consentHash = await sha256(CONSENT_TEXT_V1);
      const previousHash = await getLastHash();
      const ua = (navigator.userAgent || '').slice(0, 300);
      // Get current user
      const { data: userData } = await window.supa.auth.getUser();
      // Build row WITHOUT this_hash (will compute now)
      const rowPartial = {
        client_id: clientId,
        client_name: clientName,
        client_phone_last4: phoneLast4,
        signature_canvas: signature,
        consent_text_version: 'v1.0',
        consent_text_hash: consentHash,
        signed_at: new Date().toISOString(),
        signed_by_user_id: userData?.user?.id || null,
        previous_hash: previousHash,
        user_agent: ua
      };
      // Compute this_hash from the row's deterministic fields
      const seriPart = JSON.stringify({
        client_id: rowPartial.client_id,
        client_name: rowPartial.client_name,
        client_phone_last4: rowPartial.client_phone_last4,
        consent_text_hash: rowPartial.consent_text_hash,
        signed_at: rowPartial.signed_at,
        signed_by_user_id: rowPartial.signed_by_user_id,
        previous_hash: rowPartial.previous_hash
      });
      const thisHash = await sha256(seriPart);
      const row = { ...rowPartial, this_hash: thisHash };

      const { error } = await window.supa.from('argaman_consents').insert(row);
      if (error) throw error;

      try { window.Audit?.logAction('create', 'consent', clientId, clientName); } catch(_){}
      window.toast?.('✅ הסכמה נשמרה ונחתמה דיגיטלית','success');
      window.closeModal?.();
    } catch (e) {
      console.error('saveConsent error:', e);
      window.toast?.('שגיאה: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = 'שמור הסכמה';
    }
  };

  /** Check if a client has signed consent */
  async function hasSignedConsent(clientId){
    if (!window.supa) return false;
    try {
      const { count } = await window.supa.from('argaman_consents')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);
      return (count || 0) > 0;
    } catch(_){ return false; }
  }

  /** Verify integrity of consent chain */
  async function verifyChain(){
    if (!window.supa) return { ok: false, error: 'Supabase לא זמין' };
    const { data, error } = await window.supa
      .from('argaman_consents')
      .select('*')
      .order('id', { ascending: true });
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) return { ok: true, count: 0 };
    let prev = null;
    for (const r of data){
      if (r.previous_hash !== prev) return { ok: false, error: `Chain broken at id=${r.id}` };
      const seriPart = JSON.stringify({
        client_id: r.client_id, client_name: r.client_name,
        client_phone_last4: r.client_phone_last4, consent_text_hash: r.consent_text_hash,
        signed_at: r.signed_at, signed_by_user_id: r.signed_by_user_id,
        previous_hash: r.previous_hash
      });
      const expected = await sha256(seriPart);
      if (expected !== r.this_hash) return { ok: false, error: `Hash mismatch at id=${r.id}` };
      prev = r.this_hash;
    }
    return { ok: true, count: data.length };
  }

  window.ConsentFlow = { open: openConsentModal, hasSignedConsent, verifyChain };
  window.openConsentModal = openConsentModal;
})();
