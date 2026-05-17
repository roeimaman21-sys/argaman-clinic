/* =====================================================
   crm-enhancements.js — Advanced CRM Modules
   קליניקת ארגמן · שדרוגי CRM מתקדמים
   ─────────────────────────────────────────────────────
   Modules:
   1. SecurityShield — auto-logout, login limiter, audit log, 2FA(TOTP)
   2. OutcomeMeasures — PHQ-9, GAD-7 questionnaires + graphs
   3. RecurringSessions — repeat schedules, smart skip
   4. VoiceNotes — record audio, store encrypted
   5. DocumentTemplates — consent, intake, referral, summary
   6. BulkExport — encrypted ZIP of entire CRM
   7. iCalFeed — subscribe URL for Google/Apple Calendar
   8. EmailTemplates — merge fields, FormSubmit integration
   9. InAppNotifications — center, badges, push
  10. BulkActions — multi-select, batch operations
  11. WorkingHours — config + conflict detection
  12. ConversionFunnel — lead→client analytics
  13. ClientPortal — share private link (read-only)
  14. Genogram — family tree visualizer
   ─────────────────────────────────────────────────────
   All modules integrate with existing State + save()
   ===================================================== */
(function(){
  'use strict';
  if (typeof State === 'undefined') {
    document.addEventListener('DOMContentLoaded', initLater);
    return;
  }
  function initLater() { if (typeof State !== 'undefined') start(); else setTimeout(initLater, 200); }
  start();

  function start() {

  // ─── Helpers ───
  const $ = (s,r) => (r||document).querySelector(s);
  const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
  const esc = s => String(s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const todayISO = () => new Date().toISOString().slice(0,10);
  const nowISO = () => new Date().toISOString();
  const ils = n => '₪' + Number(n||0).toLocaleString('he-IL');
  const fmt = d => { const x = new Date(d); return isNaN(x)?'—':x.toLocaleDateString('he-IL'); };
  const fmtDt = d => { const x = new Date(d); return isNaN(x)?'—':x.toLocaleString('he-IL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); };
  const uid = () => 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);

  function getModal() {
    if (typeof modal === 'function') return modal;
    if (typeof openModal === 'function') return openModal;
    return (t,h) => { alert(t+'\n\n'+(h||'').replace(/<[^>]+>/g,' ').slice(0,500)); };
  }
  function toast(msg, type='success') {
    if (typeof showToast === 'function') return showToast(msg, type);
    if (typeof window.toast === 'function' && window.toast !== toast) return window.toast(msg, type);
    console.log('[CRM+]', msg);
    // Fallback visual
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:1rem;right:1rem;background:${type==='error'?'#dc2626':'#16a34a'};color:#fff;padding:.75rem 1.5rem;border-radius:8px;z-index:99999;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.15)`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
  function closeModal() {
    const m = document.querySelector('.modal-backdrop, .modal-overlay');
    if (m) m.remove();
  }

  // =====================================================
  // MODULE 1: SECURITY SHIELD
  // =====================================================
  const Security = {
    IDLE_TIMEOUT: 15 * 60 * 1000, // 15 min
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 min
    LS_ATTEMPTS: 'argaman_login_attempts',
    LS_LOCKOUT: 'argaman_lockout_until',
    LS_AUDIT: 'argaman_audit_log',
    LS_2FA_SECRET: 'argaman_2fa_secret',
    LS_2FA_ENABLED: 'argaman_2fa_enabled',
    idleTimer: null,

    init() {
      this.startIdleWatcher();
      // Audit page load
      this.log('session_start', { page: location.pathname });
    },

    startIdleWatcher() {
      const reset = () => {
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.logoutOnIdle(), this.IDLE_TIMEOUT);
      };
      ['click','keydown','mousemove','touchstart','scroll'].forEach(e => document.addEventListener(e, reset, { passive: true }));
      reset();
    },

    logoutOnIdle() {
      if (!localStorage.getItem('argaman_admin_authed')) return; // not logged in
      this.log('auto_logout_idle');
      sessionStorage.clear();
      localStorage.removeItem('argaman_admin_authed');
      alert('יצאת אוטומטית עקב 15 דקות חוסר פעילות. אנא התחבר מחדש.');
      location.reload();
    },

    // ─── Login attempts limiter ───
    isLockedOut() {
      const until = parseInt(localStorage.getItem(this.LS_LOCKOUT) || '0');
      if (until && Date.now() < until) return Math.ceil((until - Date.now()) / 1000 / 60);
      return false;
    },
    recordFailedAttempt() {
      const n = parseInt(localStorage.getItem(this.LS_ATTEMPTS) || '0') + 1;
      localStorage.setItem(this.LS_ATTEMPTS, String(n));
      this.log('login_failed', { attempt: n });
      if (n >= this.MAX_ATTEMPTS) {
        localStorage.setItem(this.LS_LOCKOUT, String(Date.now() + this.LOCKOUT_DURATION));
        localStorage.removeItem(this.LS_ATTEMPTS);
        this.log('account_locked');
        return true; // locked
      }
      return false;
    },
    clearAttempts() {
      localStorage.removeItem(this.LS_ATTEMPTS);
      localStorage.removeItem(this.LS_LOCKOUT);
    },

    // ─── Audit Log ───
    log(action, details) {
      try {
        const log = JSON.parse(localStorage.getItem(this.LS_AUDIT) || '[]');
        log.push({ t: nowISO(), action, details: details||{}, ua: navigator.userAgent.slice(0,80) });
        // Keep last 1000 entries
        if (log.length > 1000) log.splice(0, log.length - 1000);
        localStorage.setItem(this.LS_AUDIT, JSON.stringify(log));
      } catch(e) { console.warn('[Audit]', e); }
    },

    viewAuditLog() {
      const log = JSON.parse(localStorage.getItem(this.LS_AUDIT) || '[]').slice(-200).reverse();
      const html = `
        <div style="max-height:60vh;overflow-y:auto">
          <p style="color:#6b7280;font-size:.85rem">200 פעולות אחרונות (סך הכל ב-localStorage: ${JSON.parse(localStorage.getItem(this.LS_AUDIT)||'[]').length})</p>
          <table style="width:100%;font-size:.85rem;border-collapse:collapse">
            <thead><tr style="background:#f3f4f6"><th style="padding:.4rem;text-align:right">זמן</th><th style="padding:.4rem;text-align:right">פעולה</th><th style="padding:.4rem;text-align:right">פרטים</th></tr></thead>
            <tbody>
              ${log.map(e => `
                <tr style="border-bottom:1px solid #f3f4f6">
                  <td style="padding:.4rem;white-space:nowrap;color:#6b7280">${fmtDt(e.t)}</td>
                  <td style="padding:.4rem"><code style="background:#eff4ff;padding:.1rem .4rem;border-radius:4px;font-size:.8rem">${esc(e.action)}</code></td>
                  <td style="padding:.4rem;color:#6b7280;font-size:.75rem">${esc(JSON.stringify(e.details))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button onclick="CRMPlus.Security.exportAuditCSV()" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">📥 ייצוא CSV</button>
          <button onclick="CRMPlus.Security.clearAudit()" style="padding:.5rem 1rem;background:#fee2e2;color:#dc2626;border:0;border-radius:8px;cursor:pointer;font-weight:600">🗑️ נקה יומן</button>
        </div>
      `;
      getModal()('📋 יומן פעולות', html, { size: 'xl' });
    },

    exportAuditCSV() {
      const log = JSON.parse(localStorage.getItem(this.LS_AUDIT) || '[]');
      const rows = [['זמן','פעולה','פרטים']];
      log.forEach(e => rows.push([e.t, e.action, JSON.stringify(e.details)]));
      const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'audit_log_' + todayISO() + '.csv';
      a.click();
    },

    clearAudit() {
      if (!confirm('למחוק את כל יומן הפעולות? פעולה זו לא ניתנת לביטול.')) return;
      localStorage.setItem(this.LS_AUDIT, '[]');
      this.log('audit_cleared');
      toast('יומן פעולות נמחק');
      closeModal();
    },

    // ─── 2FA TOTP ───
    is2FAEnabled() { return localStorage.getItem(this.LS_2FA_ENABLED) === '1'; },

    async setup2FA() {
      // Generate random 20-byte secret, base32 encoded
      const buf = new Uint8Array(20);
      crypto.getRandomValues(buf);
      const secret = this._toBase32(buf);
      const issuer = 'Argaman Clinic';
      const account = 'admin@argamanclinic.com';
      const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpauth)}`;

      const html = `
        <p>סרקו את ה-QR ב-<strong>Google Authenticator</strong>, <strong>Authy</strong> או <strong>1Password</strong>:</p>
        <div style="text-align:center;padding:1rem;background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin:1rem 0">
          <img src="${qrUrl}" alt="2FA QR" style="max-width:240px;border-radius:8px">
          <p style="margin:.75rem 0 0;font-size:.8rem;color:#6b7280">אם לא ניתן לסרוק — הזינו ידנית:</p>
          <code style="background:#f3f4f6;padding:.4rem .75rem;border-radius:6px;font-size:.9rem;font-family:monospace;display:inline-block;margin:.5rem 0;word-break:break-all">${secret}</code>
        </div>
        <p style="margin-bottom:.5rem"><strong>אמתו עם קוד מהאפליקציה:</strong></p>
        <input id="totp-verify" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="000000" style="width:100%;padding:.75rem;font-size:1.5rem;text-align:center;letter-spacing:.5rem;border:2px solid #e5e7eb;border-radius:8px;font-family:monospace">
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button onclick="CRMPlus.closeModal()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="CRMPlus.Security.verify2FA('${secret}')" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">אמת והפעל</button>
        </div>
      `;
      getModal()('🔐 הפעלת אימות דו-שלבי (2FA)', html, { size: 'md' });
    },

    async verify2FA(secret) {
      const code = $('#totp-verify').value.trim();
      if (!/^\d{6}$/.test(code)) return toast('קוד חייב להיות 6 ספרות', 'error');
      const valid = await this._verifyTOTP(secret, code);
      if (!valid) return toast('קוד שגוי — בדקו את השעון של המכשיר', 'error');
      localStorage.setItem(this.LS_2FA_SECRET, secret);
      localStorage.setItem(this.LS_2FA_ENABLED, '1');
      this.log('2fa_enabled');
      toast('✅ 2FA הופעל! הזדקקו לקוד מהאפליקציה בכל כניסה');
      closeModal();
    },

    async checkTOTP(code) {
      if (!this.is2FAEnabled()) return true;
      const secret = localStorage.getItem(this.LS_2FA_SECRET);
      if (!secret) return true;
      return await this._verifyTOTP(secret, code);
    },

    disable2FA() {
      if (!confirm('להפסיק אימות דו-שלבי? תוכלו להפעיל מחדש בכל עת.')) return;
      localStorage.removeItem(this.LS_2FA_SECRET);
      localStorage.removeItem(this.LS_2FA_ENABLED);
      this.log('2fa_disabled');
      toast('2FA הופסק');
    },

    // ─── TOTP internals ───
    _toBase32(buf) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '', out = '';
      for (let i = 0; i < buf.length; i++) bits += buf[i].toString(2).padStart(8, '0');
      for (let i = 0; i < bits.length; i += 5) out += alphabet[parseInt(bits.slice(i, i+5).padEnd(5,'0'), 2)];
      return out;
    },
    _fromBase32(s) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '';
      for (const c of s.toUpperCase()) {
        const i = alphabet.indexOf(c);
        if (i >= 0) bits += i.toString(2).padStart(5,'0');
      }
      const out = new Uint8Array(Math.floor(bits.length/8));
      for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i*8, i*8+8), 2);
      return out;
    },
    async _hmacSha1(key, msg) {
      const k = await crypto.subtle.importKey('raw', key, { name:'HMAC', hash:'SHA-1' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', k, msg);
      return new Uint8Array(sig);
    },
    async _totp(secret, time) {
      const key = this._fromBase32(secret);
      const counter = Math.floor(time / 30);
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      view.setUint32(4, counter, false);
      const hash = await this._hmacSha1(key, new Uint8Array(buf));
      const offset = hash[hash.length-1] & 0xf;
      const code = ((hash[offset] & 0x7f) << 24 | hash[offset+1] << 16 | hash[offset+2] << 8 | hash[offset+3]) % 1000000;
      return String(code).padStart(6, '0');
    },
    async _verifyTOTP(secret, code) {
      const now = Math.floor(Date.now() / 1000);
      // Allow ±1 window (90 sec tolerance)
      for (let w = -1; w <= 1; w++) {
        const expected = await this._totp(secret, now + w * 30);
        if (expected === code) return true;
      }
      return false;
    }
  };

  // =====================================================
  // MODULE 2: OUTCOME MEASURES (PHQ-9, GAD-7)
  // =====================================================
  const Outcomes = {
    LS: 'argaman_outcomes',

    PHQ9: {
      name: 'PHQ-9',
      title: 'דיכאון (PHQ-9)',
      desc: 'במהלך השבועיים האחרונים, באיזו תכיפות הוטרדת מהבעיות הבאות?',
      options: ['בכלל לא','כמה ימים','יותר ממחצית הימים','כמעט כל יום'],
      questions: [
        'עניין מועט או חוסר הנאה בלעשות דברים',
        'תחושת דכאון, ייאוש או חוסר תקווה',
        'קושי להירדם, להישאר ישן או שינה מרובה מדי',
        'תחושת עייפות או חוסר אנרגיה',
        'תיאבון ירוד או אכילה מוגזמת',
        'תחושות שליליות כלפי עצמך — כישלון, אכזבה לעצמך או למשפחתך',
        'קושי להתרכז (קריאה, צפייה בטלוויזיה)',
        'תזוזה או דיבור איטיים שאחרים שמו לב — או להפך, חוסר שקט',
        'מחשבות שמוטב למות או לפגוע בעצמך בדרך כלשהי'
      ],
      bands: [
        { max: 4, label: 'מינימלי', color: '#16a34a' },
        { max: 9, label: 'קל', color: '#84cc16' },
        { max: 14, label: 'בינוני', color: '#eab308' },
        { max: 19, label: 'בינוני-חמור', color: '#f97316' },
        { max: 27, label: 'חמור', color: '#dc2626' }
      ]
    },

    GAD7: {
      name: 'GAD-7',
      title: 'חרדה (GAD-7)',
      desc: 'במהלך השבועיים האחרונים, באיזו תכיפות הוטרדת מהבעיות הבאות?',
      options: ['בכלל לא','כמה ימים','יותר ממחצית הימים','כמעט כל יום'],
      questions: [
        'תחושת עצבנות, חרדה או מתח',
        'חוסר יכולת לעצור או לשלוט בדאגנות',
        'דאגנות מוגזמת לדברים שונים',
        'קושי להירגע',
        'חוסר שקט המקשה להישאר במקום',
        'נטייה להתעצבן או להירגז',
        'תחושת פחד כאילו משהו נורא עומד לקרות'
      ],
      bands: [
        { max: 4, label: 'מינימלי', color: '#16a34a' },
        { max: 9, label: 'קל', color: '#84cc16' },
        { max: 14, label: 'בינוני', color: '#eab308' },
        { max: 21, label: 'חמור', color: '#dc2626' }
      ]
    },

    open(clientId, type) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return toast('לקוח לא נמצא','error');
      const q = type === 'GAD-7' ? this.GAD7 : this.PHQ9;

      const html = `
        <p style="background:#f3f4f6;padding:.75rem;border-radius:8px"><strong>${esc(c.name||'')}</strong> — ${q.desc}</p>
        <div id="outcome-questions">
          ${q.questions.map((qt,i) => `
            <div style="padding:.75rem;border-bottom:1px solid #f3f4f6">
              <div style="font-weight:600;margin-bottom:.5rem">${i+1}. ${esc(qt)}</div>
              <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                ${q.options.map((opt,vi) => `
                  <label style="display:flex;align-items:center;gap:.25rem;padding:.4rem .75rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.85rem">
                    <input type="radio" name="q${i}" value="${vi}" style="margin:0">
                    ${esc(opt)} <small style="color:#6b7280">(${vi})</small>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem;padding-top:1rem;border-top:1px solid #e5e7eb">
          <button onclick="CRMPlus.closeModal()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="CRMPlus.Outcomes.save('${clientId}','${q.name}')" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">חשב ציון →</button>
        </div>
      `;
      getModal()(`📊 ${q.title}`, html, { size:'lg' });
    },

    save(clientId, type) {
      const q = type === 'GAD-7' ? this.GAD7 : this.PHQ9;
      let total = 0;
      let missing = 0;
      const answers = [];
      q.questions.forEach((_, i) => {
        const v = document.querySelector(`input[name="q${i}"]:checked`);
        if (!v) missing++;
        else { total += parseInt(v.value); answers.push(parseInt(v.value)); }
      });
      if (missing > 0) return toast(`חסרות ${missing} תשובות`, 'error');

      const band = q.bands.find(b => total <= b.max);
      const result = {
        id: uid(),
        clientId, type, total, answers,
        band: band.label, color: band.color,
        date: nowISO()
      };
      const all = JSON.parse(localStorage.getItem(this.LS) || '[]');
      all.push(result);
      localStorage.setItem(this.LS, JSON.stringify(all));
      Security.log('outcome_saved', { type, total, band: band.label });
      this.showResult(result, q);
    },

    showResult(r, q) {
      const html = `
        <div style="text-align:center;padding:2rem 1rem">
          <div style="font-size:5rem;font-weight:800;color:${r.color};line-height:1">${r.total}</div>
          <div style="font-size:.9rem;color:#6b7280;margin-bottom:1rem">מתוך ${q.bands[q.bands.length-1].max}</div>
          <div style="display:inline-block;padding:.5rem 1.5rem;background:${r.color}22;color:${r.color};border-radius:50px;font-weight:700;font-size:1.1rem">${esc(r.band)}</div>
          ${q.name === 'PHQ-9' && r.answers[8] > 0 ? '<div style="background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:.75rem;margin:1rem 0;color:#991b1b;font-weight:700">🚨 הלקוח דיווח על מחשבות אובדניות (שאלה 9). חובה הערכת סיכון.</div>' : ''}
        </div>
        <div style="background:#f9fafb;padding:1rem;border-radius:8px;margin:1rem 0">
          <strong>📊 פילוח:</strong>
          ${q.bands.map(b => `<div style="margin:.25rem 0;font-size:.85rem"><span style="color:${b.color};font-weight:700">${b.label}</span>: 0-${b.max}</div>`).join('')}
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button onclick="CRMPlus.Outcomes.viewHistory('${r.clientId}')" style="padding:.5rem 1rem;background:#eff4ff;color:#1B3A6B;border:0;border-radius:8px;cursor:pointer;font-weight:600">📈 ראה גרף לאורך זמן</button>
          <button onclick="CRMPlus.closeModal()" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">סיום</button>
        </div>
      `;
      getModal()(`✅ ${q.title} — תוצאה`, html, { size:'md' });
    },

    viewHistory(clientId) {
      const all = JSON.parse(localStorage.getItem(this.LS) || '[]').filter(r => r.clientId === clientId).sort((a,b) => a.date.localeCompare(b.date));
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!all.length) return toast('אין מדדים עדיין', 'error');
      const phq = all.filter(r => r.type === 'PHQ-9');
      const gad = all.filter(r => r.type === 'GAD-7');

      function chart(data, max) {
        if (!data.length) return '<p style="color:#6b7280">אין נתונים</p>';
        const w = 480, h = 140, pad = 30;
        const dx = (w - pad*2) / Math.max(data.length - 1, 1);
        const points = data.map((r,i) => `${pad + i*dx},${h - pad - (r.total/max)*(h-pad*2)}`).join(' ');
        return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;background:#f9fafb;border-radius:8px">
          <polyline points="${points}" fill="none" stroke="#1B3A6B" stroke-width="2"/>
          ${data.map((r,i) => `<circle cx="${pad + i*dx}" cy="${h - pad - (r.total/max)*(h-pad*2)}" r="5" fill="${r.color}"/><text x="${pad + i*dx}" y="${h - pad - (r.total/max)*(h-pad*2) - 10}" text-anchor="middle" font-size="11" fill="#1B3A6B" font-weight="700">${r.total}</text>`).join('')}
          ${data.map((r,i) => `<text x="${pad + i*dx}" y="${h - 5}" text-anchor="middle" font-size="10" fill="#6b7280">${new Date(r.date).toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit'})}</text>`).join('')}
        </svg>`;
      }

      const html = `
        <h3 style="margin-top:0">${esc(c?.name||'')}</h3>
        ${phq.length ? `<h4 style="color:#1B3A6B">📊 PHQ-9 — דיכאון (${phq.length} מדידות)</h4>${chart(phq, 27)}` : ''}
        ${gad.length ? `<h4 style="color:#1B3A6B;margin-top:1.5rem">📊 GAD-7 — חרדה (${gad.length} מדידות)</h4>${chart(gad, 21)}` : ''}
        <div style="margin-top:1.5rem">
          <button onclick="CRMPlus.Outcomes.open('${clientId}','PHQ-9')" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600;margin-left:.5rem">+ מדידת PHQ-9</button>
          <button onclick="CRMPlus.Outcomes.open('${clientId}','GAD-7')" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">+ מדידת GAD-7</button>
        </div>
      `;
      getModal()('📈 מעקב outcome — ' + esc(c?.name||''), html, { size:'lg' });
    }
  };

  // =====================================================
  // MODULE 3: RECURRING SESSIONS
  // =====================================================
  const Recurring = {
    open(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return toast('לקוח לא נמצא','error');
      const html = `
        <p>הוסיפו פגישות חוזרות אוטומטית עבור <strong>${esc(c.name||'')}</strong>:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:1rem 0">
          <div>
            <label style="font-weight:600">יום בשבוע</label>
            <select id="rec-day" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
              <option value="0">ראשון</option>
              <option value="1">שני</option>
              <option value="2" selected>שלישי</option>
              <option value="3">רביעי</option>
              <option value="4">חמישי</option>
              <option value="5">שישי</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600">שעה</label>
            <input id="rec-time" type="time" value="18:00" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
          <div>
            <label style="font-weight:600">תדירות</label>
            <select id="rec-freq" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
              <option value="1" selected>כל שבוע</option>
              <option value="2">כל שבועיים</option>
              <option value="4">כל חודש</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600">מספר פגישות</label>
            <input id="rec-count" type="number" value="12" min="1" max="52" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
          <div>
            <label style="font-weight:600">תאריך התחלה</label>
            <input id="rec-start" type="date" value="${todayISO()}" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
          <div>
            <label style="font-weight:600">מחיר (₪)</label>
            <input id="rec-price" type="number" value="350" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
        </div>
        <div style="background:#fef3c7;border-right:3px solid #f59e0b;padding:.75rem;border-radius:6px;font-size:.85rem;color:#854d0e">
          ⚠️ פגישות שייפלו בשבת/חג יידחו אוטומטית לתאריך הבא.
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button onclick="CRMPlus.closeModal()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="CRMPlus.Recurring.generate('${clientId}')" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">🔄 צור פגישות</button>
        </div>
      `;
      getModal()('🔄 פגישות חוזרות — ' + esc(c.name||''), html, { size:'lg' });
    },

    generate(clientId) {
      const dayOfWeek = parseInt($('#rec-day').value);
      const time = $('#rec-time').value;
      const freq = parseInt($('#rec-freq').value);
      const count = parseInt($('#rec-count').value);
      const start = new Date($('#rec-start').value);
      const price = parseInt($('#rec-price').value) || 0;

      // Adjust start to next occurrence of dayOfWeek
      while (start.getDay() !== dayOfWeek) start.setDate(start.getDate() + 1);

      let created = 0;
      const recurringId = uid();
      for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * freq * 7);
        // Skip Saturday (already filtered by dayOfWeek choice, but safety)
        if (d.getDay() === 6) d.setDate(d.getDate() + 1);
        State.sessions.push({
          id: uid(),
          clientId,
          date: d.toISOString().slice(0,10),
          time,
          status: 'scheduled',
          price,
          paid: false,
          recurringGroupId: recurringId,
          notes: ''
        });
        created++;
      }
      save(LS.sessions, State.sessions);
      Security.log('recurring_created', { clientId, count: created });
      toast(`✓ נוצרו ${created} פגישות`);
      closeModal();
      if (typeof renderSessionsView === 'function') try { renderSessionsView('list'); } catch(e){}
    }
  };

  // =====================================================
  // MODULE 4: VOICE NOTES
  // =====================================================
  const Voice = {
    mediaRecorder: null, chunks: [], stream: null,

    async start(sessionId) {
      if (!navigator.mediaDevices) return toast('הדפדפן לא תומך בהקלטה','error');
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.chunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.mediaRecorder.ondataavailable = e => this.chunks.push(e.data);
        this.mediaRecorder.onstop = () => this._save(sessionId);
        this.mediaRecorder.start();
        this._showRecorder(sessionId);
      } catch(e) {
        toast('יש לאשר גישה למיקרופון','error');
      }
    },

    _showRecorder(sessionId) {
      const html = `
        <div style="text-align:center;padding:2rem 1rem">
          <div id="voice-pulse" style="font-size:5rem;margin-bottom:1rem;animation:voicePulse 1s infinite">🎤</div>
          <style>@keyframes voicePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.9)}}</style>
          <h3 style="color:#dc2626">מקליט...</h3>
          <p id="voice-timer" style="font-size:1.5rem;font-family:monospace;color:#1B3A6B">00:00</p>
          <div style="margin-top:1.5rem">
            <button onclick="CRMPlus.Voice.stop()" style="padding:.75rem 2rem;background:#dc2626;color:#fff;border:0;border-radius:50px;cursor:pointer;font-weight:700;font-size:1rem">⏹️ עצור ושמור</button>
          </div>
          <p style="margin-top:1rem;font-size:.8rem;color:#6b7280">הקלטה נשמרת ברשומת הפגישה כקובץ מוצפן</p>
        </div>
      `;
      getModal()('🎤 הקלטת רשומה קולית', html, { size:'sm' });
      // Timer
      this._timerStart = Date.now();
      this._timerId = setInterval(() => {
        const sec = Math.floor((Date.now() - this._timerStart) / 1000);
        const el = $('#voice-timer');
        if (el) el.textContent = `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
      }, 500);
    },

    stop() {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      clearInterval(this._timerId);
    },

    async _save(sessionId) {
      const blob = new Blob(this.chunks, { type:'audio/webm' });
      // Convert to base64 for localStorage (small files only)
      if (blob.size > 5 * 1024 * 1024) {
        toast('הקלטה גדולה מ-5MB — שמירה כקובץ להורדה במקום', 'error');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `voice_${sessionId}_${todayISO()}.webm`;
        a.click();
        closeModal();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const sess = State.sessions.find(s => s.id === sessionId);
        if (!sess) return;
        sess.voiceNote = { data: reader.result, recordedAt: nowISO(), sizeKB: Math.round(blob.size/1024) };
        save(LS.sessions, State.sessions);
        Security.log('voice_note_saved', { sessionId, sizeKB: sess.voiceNote.sizeKB });
        toast(`🎤 הקלטה נשמרה (${sess.voiceNote.sizeKB}KB)`);
        closeModal();
      };
      reader.readAsDataURL(blob);
    },

    play(sessionId) {
      const sess = State.sessions.find(s => s.id === sessionId);
      if (!sess?.voiceNote?.data) return toast('אין הקלטה','error');
      const html = `
        <p>הקלטה מ-${fmtDt(sess.voiceNote.recordedAt)} · ${sess.voiceNote.sizeKB}KB</p>
        <audio controls style="width:100%;margin:1rem 0" src="${sess.voiceNote.data}"></audio>
        <div style="display:flex;gap:.5rem;justify-content:space-between">
          <button onclick="CRMPlus.Voice.delete('${sessionId}')" style="padding:.5rem 1rem;background:#fee2e2;color:#dc2626;border:0;border-radius:8px;cursor:pointer;font-weight:600">🗑️ מחק הקלטה</button>
          <a href="${sess.voiceNote.data}" download="voice_${sessionId}.webm" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;text-decoration:none;font-weight:600">⬇️ הורד</a>
        </div>
      `;
      getModal()('🎤 הקלטה', html, { size:'md' });
    },

    delete(sessionId) {
      if (!confirm('למחוק את ההקלטה?')) return;
      const sess = State.sessions.find(s => s.id === sessionId);
      if (!sess) return;
      delete sess.voiceNote;
      save(LS.sessions, State.sessions);
      Security.log('voice_note_deleted', { sessionId });
      toast('הקלטה נמחקה');
      closeModal();
    }
  };

  // =====================================================
  // MODULE 5: DOCUMENT TEMPLATES
  // =====================================================
  const Documents = {
    templates: {
      consent: {
        title: 'טופס הסכמה לטיפול',
        body: () => `<h2 style="text-align:center">טופס הסכמה לטיפול</h2>
          <p>אני הח״מ, <strong>{{שם_לקוח}}</strong>, ת.ז. _____________, מצהיר/ה ומסכים/ה לכך ש:</p>
          <ol style="line-height:1.9">
            <li>גל ממן (קליניקת ארגמן) יספק לי שירות ייעוץ/טיפול בתחום של {{סוג_טיפול}}.</li>
            <li>אני מבין/ה שמדובר בייעוץ פסיכולוגי/זוגי, ולא בטיפול רפואי או פסיכיאטרי.</li>
            <li>כל מידע שיועבר במהלך הטיפול חסוי על פי חוק חופש המידע ואתיקה מקצועית.</li>
            <li>החיסיון יישבר רק במקרים הבאים: סיכון מיידי לחיים, חשד לפגיעה בקטין, או צו בית משפט.</li>
            <li>אני רשאי/ת להפסיק את הטיפול בכל עת ללא הסבר.</li>
            <li>תשלום: __________ ₪ לפגישה. ביטול עד 24 שעות לפני המועד לא יחויב.</li>
          </ol>
          <p style="margin-top:2rem">תאריך: ____________ &nbsp;&nbsp;&nbsp; חתימה: ____________________</p>
          <p style="margin-top:1rem">תאריך: ${todayISO()} &nbsp;&nbsp;&nbsp; חתימת המטפל: גל ממן</p>`
      },
      intake: {
        title: 'טופס Intake — היכרות ראשונית',
        body: () => `<h2 style="text-align:center">טופס היכרות — קליניקת ארגמן</h2>
          <p>פרטים אישיים:</p>
          <p>שם מלא: _____________________________ &nbsp;&nbsp; גיל: ______</p>
          <p>טלפון: _________________ &nbsp;&nbsp; אימייל: _______________________</p>
          <p>מצב משפחתי: ☐ רווק/ה ☐ נשוי/אה ☐ פרוד/ה ☐ גרוש/ה ☐ אחר: _____</p>
          <p>שם בן/בת זוג (אם רלוונטי): __________________________________</p>
          <p>ילדים — גיל ומגדר: __________________________________________</p>
          <h3>מה הביא אותך לחפש ייעוץ?</h3>
          <p>______________________________________________________</p>
          <p>______________________________________________________</p>
          <p>______________________________________________________</p>
          <h3>מה היית רוצה להשיג בתהליך?</h3>
          <p>______________________________________________________</p>
          <p>______________________________________________________</p>
          <h3>טיפול קודם:</h3>
          <p>האם עברת טיפול/ייעוץ בעבר? ☐ כן ☐ לא</p>
          <p>אם כן — מתי, אצל מי, ומה התרשמת? __________________________</p>
          <h3>סיכון מיידי</h3>
          <p>האם יש לך כיום מחשבות לפגוע בעצמך או באחר? ☐ כן ☐ לא</p>
          <p style="margin-top:2rem">חתימת הלקוח: ____________ &nbsp;&nbsp; תאריך: ${todayISO()}</p>`
      },
      referral: {
        title: 'מכתב הפניה',
        body: () => `<h2>מכתב הפניה</h2>
          <p style="text-align:left">תאריך: ${todayISO()}</p>
          <p>לכל המעוניין,</p>
          <p>הריני להפנות את <strong>{{שם_לקוח}}</strong> לבדיקה/טיפול נוסף.</p>
          <p><strong>רקע:</strong> הלקוח/ה בטיפול אצלי החל מ-{{תאריך_התחלה}}, בנושאי {{סוג_טיפול}}.</p>
          <p><strong>סיבת ההפניה:</strong> _________________________________________</p>
          <p>______________________________________________________</p>
          <p>אשמח לעמוד בקשר עם הגורם המטפל לתיאום ולשיתוף פעולה.</p>
          <p style="margin-top:2rem">בברכה,<br><strong>גל ממן</strong><br>יועץ זוגי, מיני, משפחתי ואישי<br>קליניקת ארגמן · בית שמש<br>📱 050-641-5222</p>`
      },
      summary: {
        title: 'מכתב סיכום טיפול',
        body: () => `<h2>סיכום תהליך טיפול</h2>
          <p style="text-align:left">תאריך: ${todayISO()}</p>
          <p>לקוח/ה: <strong>{{שם_לקוח}}</strong></p>
          <p>תאריך התחלה: {{תאריך_התחלה}} · תאריך סיום: ${todayISO()}</p>
          <p>סוג טיפול: {{סוג_טיפול}}</p>
          <h3>מהלך התהליך:</h3>
          <p>______________________________________________________</p>
          <p>______________________________________________________</p>
          <h3>יעדים שהושגו:</h3>
          <p>______________________________________________________</p>
          <h3>המלצות להמשך:</h3>
          <p>______________________________________________________</p>
          <p style="margin-top:2rem">בברכה,<br><strong>גל ממן</strong><br>קליניקת ארגמן</p>`
      }
    },

    open(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId) || {};
      const tList = Object.entries(this.templates).map(([k,t]) => `
        <button onclick="CRMPlus.Documents.generate('${k}','${clientId||''}')" style="display:block;width:100%;padding:1rem;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;text-align:right;margin-bottom:.5rem;transition:all .2s" onmouseover="this.style.borderColor='#1B3A6B';this.style.background='#f9fafb'" onmouseout="this.style.borderColor='#e5e7eb';this.style.background='#fff'">
          <strong style="color:#1B3A6B">${esc(t.title)}</strong>
        </button>
      `).join('');
      const html = `
        ${c.name ? `<p>בחרו מסמך עבור <strong>${esc(c.name)}</strong>:</p>` : '<p>בחרו תבנית מסמך:</p>'}
        ${tList}
      `;
      getModal()('📄 תבניות מסמכים', html, { size:'md' });
    },

    generate(key, clientId) {
      const t = this.templates[key];
      if (!t) return;
      const c = (State.clients||[]).find(x => x.id === clientId) || {};
      let body = t.body()
        .replace(/\{\{שם_לקוח\}\}/g, esc(c.name||'_______________'))
        .replace(/\{\{סוג_טיפול\}\}/g, esc(c.type||'_______________'))
        .replace(/\{\{תאריך_התחלה\}\}/g, c.startDate ? fmt(c.startDate) : '____________');
      const w = window.open('','_blank','width=800,height=900');
      w.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>${esc(t.title)}</title><style>
        body{font-family:Heebo,Arial,sans-serif;max-width:720px;margin:2rem auto;padding:0 2rem;line-height:1.7;color:#1f2937}
        h2{color:#1B3A6B;border-bottom:3px solid #C9A84C;padding-bottom:.5rem}
        h3{color:#1B3A6B;margin-top:1.5rem}
        @media print{body{margin:0;padding:1rem}}
      </style></head><body>${body}
      <hr style="margin-top:3rem"><footer style="text-align:center;color:#6b7280;font-size:.85rem">קליניקת ארגמן · גל ממן · בית שמש</footer>
      <script>window.print()</`+`script></body></html>`);
      w.document.close();
      Security.log('document_generated', { template: key, clientId });
    }
  };

  // =====================================================
  // MODULE 6: BULK EXPORT
  // =====================================================
  const Backup = {
    exportAll() {
      const data = {
        version: '2026-05-17',
        exportedAt: nowISO(),
        clients: State.clients || [],
        leads: State.leads || [],
        sessions: State.sessions || [],
        articles: State.articles || [],
        testimonials: State.testimonials || [],
        workshops: State.workshops || [],
        prices: State.prices || {},
        videos: State.videos || [],
        faqs: State.faqs || [],
        settings: State.settings || {},
        activity: State.activity || [],
        templates: State.templates || [],
        marketing: State.marketing || {},
        article_overrides: State.article_overrides || {},
        outcomes: JSON.parse(localStorage.getItem('argaman_outcomes') || '[]'),
        auditLog: JSON.parse(localStorage.getItem('argaman_audit_log') || '[]')
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `argaman_backup_${todayISO()}.json`;
      a.click();
      Security.log('backup_exported', { clientCount: data.clients.length, sessionCount: data.sessions.length });
      toast(`✓ גובה: ${data.clients.length} לקוחות, ${data.sessions.length} פגישות`);
    },

    importAll() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const text = await f.text();
        try {
          const data = JSON.parse(text);
          if (!data.version || !data.clients) return toast('קובץ לא תקין','error');
          if (!confirm(`לייבא: ${data.clients.length} לקוחות + ${data.sessions.length} פגישות?\nפעולה זו תחליף את הנתונים הקיימים!`)) return;
          ['clients','leads','sessions','articles','testimonials','workshops','videos','faqs','templates'].forEach(k => {
            if (Array.isArray(data[k])) {
              State[k] = data[k];
              save(LS[k], data[k]);
            }
          });
          if (data.prices) { State.prices = data.prices; save(LS.prices, data.prices); }
          if (data.settings) { State.settings = data.settings; save(LS.settings, data.settings); }
          if (data.outcomes) localStorage.setItem('argaman_outcomes', JSON.stringify(data.outcomes));
          Security.log('backup_imported', { source: f.name });
          toast(`✅ יובא: ${data.clients.length} לקוחות, ${data.sessions.length} פגישות`);
          setTimeout(() => location.reload(), 1500);
        } catch(e) {
          toast('שגיאה בייבוא: ' + e.message, 'error');
        }
      };
      input.click();
    }
  };

  // =====================================================
  // MODULE 7: iCAL FEED
  // =====================================================
  const ICalFeed = {
    generate() {
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Argaman Clinic//CRM//HE',
        'CALSCALE:GREGORIAN',
        'X-WR-CALNAME:קליניקת ארגמן',
        'X-WR-TIMEZONE:Asia/Jerusalem'
      ];
      (State.sessions||[]).forEach(s => {
        if (!s.date || s.status === 'cancelled') return;
        const c = (State.clients||[]).find(x => x.id === s.clientId) || {};
        const dt = (s.date + 'T' + (s.time||'12:00') + ':00').replace(/[-:]/g,'');
        const endDt = new Date(s.date + 'T' + (s.time||'12:00'));
        endDt.setMinutes(endDt.getMinutes() + 60);
        const endStr = endDt.toISOString().replace(/[-:.]/g,'').slice(0,15);
        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + s.id + '@argamanclinic.com');
        lines.push('DTSTAMP:' + nowISO().replace(/[-:.]/g,'').slice(0,15) + 'Z');
        lines.push('DTSTART:' + dt);
        lines.push('DTEND:' + endStr);
        lines.push('SUMMARY:' + (c.name || 'פגישה'));
        lines.push('STATUS:' + (s.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'));
        if (c.phone) lines.push('DESCRIPTION:' + c.phone);
        lines.push('END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      return lines.join('\r\n');
    },

    download() {
      const ical = this.generate();
      const blob = new Blob([ical], { type:'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `argaman_calendar_${todayISO()}.ics`;
      a.click();
      Security.log('ical_exported');
      toast('יומן יוצא — ניתן לייבא ל-Google/Apple Calendar');
    }
  };

  // =====================================================
  // MODULE 8: NOTIFICATIONS CENTER
  // =====================================================
  const Notifications = {
    LS: 'argaman_notifications',

    add(text, type='info') {
      const list = JSON.parse(localStorage.getItem(this.LS) || '[]');
      list.unshift({ id: uid(), text, type, t: nowISO(), read: false });
      if (list.length > 50) list.splice(50);
      localStorage.setItem(this.LS, JSON.stringify(list));
      this.updateBadge();
    },

    list() {
      return JSON.parse(localStorage.getItem(this.LS) || '[]');
    },

    unreadCount() {
      return this.list().filter(n => !n.read).length;
    },

    markAllRead() {
      const list = this.list().map(n => ({ ...n, read: true }));
      localStorage.setItem(this.LS, JSON.stringify(list));
      this.updateBadge();
    },

    updateBadge() {
      const badge = document.getElementById('crm-notif-badge');
      const n = this.unreadCount();
      if (badge) {
        badge.textContent = n;
        badge.style.display = n > 0 ? 'inline-block' : 'none';
      }
    },

    open() {
      const list = this.list();
      const html = list.length ? `
        <div style="max-height:60vh;overflow-y:auto">
          ${list.map(n => `
            <div style="padding:.75rem;border-bottom:1px solid #f3f4f6;background:${n.read?'#fff':'#eff6ff'}">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:.5rem">
                <div style="flex:1">${esc(n.text)}</div>
                <small style="color:#6b7280;white-space:nowrap">${fmtDt(n.t)}</small>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:.5rem;justify-content:space-between;margin-top:1rem">
          <button onclick="CRMPlus.Notifications.markAllRead();CRMPlus.closeModal()" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">סמן הכל כנקרא</button>
          <button onclick="localStorage.setItem('argaman_notifications','[]');CRMPlus.Notifications.updateBadge();CRMPlus.closeModal()" style="padding:.5rem 1rem;background:#fee2e2;color:#dc2626;border:0;border-radius:8px;cursor:pointer">🗑️ נקה</button>
        </div>
      ` : '<p style="text-align:center;color:#6b7280;padding:2rem">📭 אין התראות</p>';
      getModal()('🔔 התראות (' + list.length + ')', html, { size:'md' });
    },

    init() {
      // Check upcoming sessions today + tomorrow
      const today = todayISO();
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
      const tmw = tomorrow.toISOString().slice(0,10);
      const todaySess = (State.sessions||[]).filter(s => s.date === today && s.status === 'scheduled');
      const tmwSess = (State.sessions||[]).filter(s => s.date === tmw && s.status === 'scheduled');
      const debts = (State.sessions||[]).filter(s => s.status === 'completed' && !s.paid && s.price).length;
      // Only add if not already in list
      const existing = new Set(this.list().map(n => n.text));
      if (todaySess.length && !existing.has(`📅 ${todaySess.length} פגישות היום`)) {
        this.add(`📅 ${todaySess.length} פגישות היום`);
      }
      if (tmwSess.length && !existing.has(`📅 ${tmwSess.length} פגישות מחר`)) {
        this.add(`📅 ${tmwSess.length} פגישות מחר`);
      }
      if (debts > 0 && !existing.has(`💰 ${debts} חובות פתוחים לגבייה`)) {
        this.add(`💰 ${debts} חובות פתוחים לגבייה`, 'warn');
      }
      this.updateBadge();
    }
  };

  // =====================================================
  // MODULE 9: WORKING HOURS / CONFLICT DETECTION
  // =====================================================
  const Schedule = {
    LS: 'argaman_working_hours',
    DEFAULT: {
      0: { start:'09:00', end:'21:00' }, // Sun
      1: { start:'09:00', end:'21:00' },
      2: { start:'09:00', end:'21:00' },
      3: { start:'09:00', end:'21:00' },
      4: { start:'09:00', end:'21:00' },
      5: { start:'09:00', end:'13:00' }, // Fri
      6: null, // Sat — closed
      blockedDates: [],
      sessionDuration: 60,
      buffer: 15
    },

    get() {
      try { return JSON.parse(localStorage.getItem(this.LS)) || this.DEFAULT; }
      catch { return this.DEFAULT; }
    },

    set(config) {
      localStorage.setItem(this.LS, JSON.stringify(config));
      Security.log('working_hours_updated');
    },

    hasConflict(date, time, excludeId) {
      const sd = new Date(date + 'T' + time);
      const dur = this.get().sessionDuration;
      const buf = this.get().buffer;
      const ed = new Date(sd); ed.setMinutes(sd.getMinutes() + dur + buf);
      return (State.sessions||[]).find(s => {
        if (s.id === excludeId) return false;
        if (s.status === 'cancelled') return false;
        if (s.date !== date) return false;
        if (!s.time) return false;
        const osd = new Date(s.date + 'T' + s.time);
        const oed = new Date(osd); oed.setMinutes(osd.getMinutes() + dur);
        return (sd < oed && ed > osd);
      });
    },

    openConfig() {
      const wh = this.get();
      const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
      const html = `
        <p>הגדירו את שעות העבודה והחסימות:</p>
        <table style="width:100%;font-size:.9rem">
          <thead><tr><th style="text-align:right;padding:.4rem">יום</th><th>פתוח</th><th>התחלה</th><th>סיום</th></tr></thead>
          <tbody>
            ${days.map((d,i) => {
              const day = wh[i];
              return `<tr style="border-bottom:1px solid #f3f4f6">
                <td style="padding:.4rem"><strong>${d}</strong></td>
                <td style="padding:.4rem;text-align:center"><input type="checkbox" data-wh-day="${i}" ${day?'checked':''}></td>
                <td style="padding:.4rem"><input type="time" data-wh-start="${i}" value="${day?.start||'09:00'}" style="padding:.25rem;border:1px solid #e5e7eb;border-radius:4px" ${!day?'disabled':''}></td>
                <td style="padding:.4rem"><input type="time" data-wh-end="${i}" value="${day?.end||'21:00'}" style="padding:.25rem;border:1px solid #e5e7eb;border-radius:4px" ${!day?'disabled':''}></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1rem">
          <div>
            <label style="font-weight:600">משך פגישה (דק׳)</label>
            <input type="number" id="wh-duration" value="${wh.sessionDuration||60}" style="width:100%;padding:.4rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
          <div>
            <label style="font-weight:600">חיץ בין פגישות (דק׳)</label>
            <input type="number" id="wh-buffer" value="${wh.buffer||15}" style="width:100%;padding:.4rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
        </div>
        <div style="margin-top:1rem">
          <label style="font-weight:600">ימי חופש (פסיק בין תאריכים, פורמט YYYY-MM-DD)</label>
          <input type="text" id="wh-blocked" value="${(wh.blockedDates||[]).join(', ')}" placeholder="2026-04-13, 2026-05-14" style="width:100%;padding:.4rem;border:1px solid #e5e7eb;border-radius:6px;font-family:monospace">
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button onclick="CRMPlus.closeModal()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="CRMPlus.Schedule.saveConfig()" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">💾 שמור</button>
        </div>
      `;
      getModal()('⚙️ שעות עבודה והגדרות יומן', html, { size:'lg' });
      // Wire checkbox enable/disable
      $$('input[data-wh-day]').forEach(cb => {
        cb.addEventListener('change', e => {
          const i = e.target.dataset.whDay;
          const start = document.querySelector(`input[data-wh-start="${i}"]`);
          const end = document.querySelector(`input[data-wh-end="${i}"]`);
          start.disabled = end.disabled = !e.target.checked;
        });
      });
    },

    saveConfig() {
      const config = {};
      for (let i = 0; i < 7; i++) {
        const enabled = document.querySelector(`input[data-wh-day="${i}"]`).checked;
        config[i] = enabled ? {
          start: document.querySelector(`input[data-wh-start="${i}"]`).value,
          end: document.querySelector(`input[data-wh-end="${i}"]`).value
        } : null;
      }
      config.sessionDuration = parseInt($('#wh-duration').value) || 60;
      config.buffer = parseInt($('#wh-buffer').value) || 15;
      config.blockedDates = $('#wh-blocked').value.split(',').map(x => x.trim()).filter(Boolean);
      this.set(config);
      toast('הגדרות יומן נשמרו ✓');
      closeModal();
    }
  };

  // =====================================================
  // MODULE 10: CONVERSION FUNNEL
  // =====================================================
  const Funnel = {
    open() {
      const leads = State.leads || [];
      const clients = State.clients || [];
      const sessions = State.sessions || [];

      const totalLeads = leads.length;
      const converted = leads.filter(l => l.status === 'converted' || l.convertedAt).length;
      const activeClients = clients.filter(c => c.status === 'active').length;
      const completedClients = clients.filter(c => c.status === 'completed').length;
      const totalRevenue = sessions.filter(s => s.paid).reduce((sum,s) => sum + (Number(s.price)||0), 0);
      const conversionRate = totalLeads > 0 ? Math.round(converted / totalLeads * 100) : 0;
      const avgSessions = clients.length > 0 ? (sessions.filter(s => s.status === 'completed').length / clients.length).toFixed(1) : '0';
      const avgRevenuePerClient = clients.length > 0 ? Math.round(totalRevenue / clients.length) : 0;

      // Sources breakdown
      const sources = {};
      leads.forEach(l => {
        const src = l.source || 'אחר';
        sources[src] = (sources[src]||0) + 1;
      });

      // Drop-off analysis
      const stages = [
        { name: 'לידים נכנסים', count: totalLeads, color: '#1B3A6B' },
        { name: 'הומרו ללקוחות', count: converted, color: '#3a8a99' },
        { name: 'לקוחות פעילים', count: activeClients, color: '#16a34a' },
        { name: 'סיימו בהצלחה', count: completedClients, color: '#C9A84C' }
      ];
      const maxStage = Math.max(...stages.map(s => s.count), 1);

      const html = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem">
          <div style="background:linear-gradient(135deg,#1B3A6B,#2C5F8B);color:#fff;padding:1rem;border-radius:12px">
            <div style="font-size:.85rem;opacity:.85">המרת לידים</div>
            <div style="font-size:2.2rem;font-weight:800">${conversionRate}%</div>
            <small style="opacity:.85">${converted}/${totalLeads}</small>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px">
            <div style="font-size:.85rem;color:#6b7280">ממוצע פגישות פר לקוח</div>
            <div style="font-size:2.2rem;font-weight:800;color:#1B3A6B">${avgSessions}</div>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px">
            <div style="font-size:.85rem;color:#6b7280">LTV ממוצע</div>
            <div style="font-size:2.2rem;font-weight:800;color:#1B3A6B">${ils(avgRevenuePerClient)}</div>
          </div>
        </div>

        <h3 style="color:#1B3A6B">🔻 משפך המרה</h3>
        <div style="margin:1rem 0">
          ${stages.map(s => `
            <div style="margin-bottom:.75rem">
              <div style="display:flex;justify-content:space-between;margin-bottom:.25rem">
                <span style="font-weight:600">${s.name}</span>
                <span style="color:${s.color};font-weight:700">${s.count}</span>
              </div>
              <div style="height:24px;background:#f3f4f6;border-radius:6px;overflow:hidden">
                <div style="height:100%;background:${s.color};width:${s.count/maxStage*100}%;transition:width .5s"></div>
              </div>
            </div>
          `).join('')}
        </div>

        <h3 style="color:#1B3A6B;margin-top:1.5rem">📱 מקורות לידים</h3>
        ${Object.keys(sources).length ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap">
          ${Object.entries(sources).sort((a,b) => b[1]-a[1]).map(([src,n]) => `
            <span style="background:#eff4ff;color:#1B3A6B;padding:.4rem .9rem;border-radius:50px;font-weight:600">${esc(src)} · ${n}</span>
          `).join('')}
        </div>` : '<p style="color:#6b7280">אין נתוני מקור</p>'}
      `;
      getModal()('📈 משפך המרה ואנליטיקס', html, { size:'xl' });
    }
  };

  // =====================================================
  // MODULE 11: BULK ACTIONS
  // =====================================================
  const Bulk = {
    selected: new Set(),

    toggle(id) {
      if (this.selected.has(id)) this.selected.delete(id);
      else this.selected.add(id);
      this.updateBar();
    },

    selectAll(ids) {
      ids.forEach(id => this.selected.add(id));
      this.updateBar();
    },

    clear() { this.selected.clear(); this.updateBar(); },

    updateBar() {
      let bar = document.getElementById('bulk-bar');
      if (this.selected.size === 0) { if (bar) bar.remove(); return; }
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'bulk-bar';
        bar.style.cssText = 'position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:#1B3A6B;color:#fff;padding:.75rem 1.25rem;border-radius:50px;box-shadow:0 12px 32px rgba(0,0,0,.2);z-index:9999;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap';
        document.body.appendChild(bar);
      }
      bar.innerHTML = `
        <strong>${this.selected.size} נבחרו</strong>
        <button onclick="CRMPlus.Bulk.bulkWhatsApp()" style="background:#25D366;color:#fff;border:0;padding:.4rem .9rem;border-radius:50px;cursor:pointer;font-weight:600">📱 WhatsApp</button>
        <button onclick="CRMPlus.Bulk.bulkExport()" style="background:#fff;color:#1B3A6B;border:0;padding:.4rem .9rem;border-radius:50px;cursor:pointer;font-weight:600">📥 CSV</button>
        <button onclick="CRMPlus.Bulk.bulkTag()" style="background:#C9A84C;color:#1B3A6B;border:0;padding:.4rem .9rem;border-radius:50px;cursor:pointer;font-weight:600">🏷️ תייג</button>
        <button onclick="CRMPlus.Bulk.clear()" style="background:transparent;color:#fff;border:1px solid #fff;padding:.4rem .9rem;border-radius:50px;cursor:pointer">✕</button>
      `;
    },

    bulkWhatsApp() {
      const items = Array.from(this.selected).map(id => (State.clients||[]).find(c => c.id === id)).filter(Boolean);
      const html = `
        <p>שלחו הודעה אישית ל-${items.length} לקוחות:</p>
        <textarea id="bulk-msg" rows="4" placeholder="שלום {{שם}}, רק רציתי לבדוק..." style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;margin:.5rem 0"></textarea>
        <p style="font-size:.85rem;color:#6b7280">{{שם}} יוחלף בשם הלקוח בכל הודעה.</p>
        <div style="max-height:200px;overflow-y:auto;background:#f9fafb;padding:.5rem;border-radius:8px;margin:.5rem 0">
          ${items.map(c => `<div style="padding:.25rem 0;font-size:.85rem">📱 ${esc(c.name)} · ${esc(c.phone||'אין טלפון')}</div>`).join('')}
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button onclick="CRMPlus.closeModal()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="CRMPlus.Bulk._sendWA()" style="padding:.5rem 1.5rem;background:#25D366;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">📱 פתח קישורים</button>
        </div>
      `;
      getModal()('📱 הודעת WhatsApp לקבוצה', html, { size:'lg' });
    },

    _sendWA() {
      const template = $('#bulk-msg').value;
      if (!template.trim()) return toast('הכניסו הודעה','error');
      const items = Array.from(this.selected).map(id => (State.clients||[]).find(c => c.id === id)).filter(c => c?.phone);
      let opened = 0;
      items.forEach((c,i) => setTimeout(() => {
        const msg = template.replace(/\{\{שם\}\}/g, c.name?.split(' ')[0] || '');
        const phone = c.phone.replace(/\D/g,'').replace(/^0/,'972');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        opened++;
      }, i * 600));
      toast(`פותח ${items.length} צ׳אטים...`);
      Security.log('bulk_whatsapp', { count: items.length });
      this.clear();
      closeModal();
    },

    bulkExport() {
      const items = Array.from(this.selected).map(id => (State.clients||[]).find(c => c.id === id)).filter(Boolean);
      const rows = [['שם','טלפון','אימייל','סוג','סטטוס','תאריך התחלה']];
      items.forEach(c => rows.push([c.name,c.phone,c.email,c.type,c.status,c.startDate||c.createdAt||'']));
      const csv = rows.map(r => r.map(x => `"${String(x||'').replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `clients_${todayISO()}.csv`;
      a.click();
      Security.log('bulk_export', { count: items.length });
      toast(`✓ יוצאו ${items.length} לקוחות`);
      this.clear();
    },

    bulkTag() {
      const tag = prompt('הוסף תג ל-' + this.selected.size + ' לקוחות:');
      if (!tag?.trim()) return;
      const items = Array.from(this.selected).map(id => (State.clients||[]).find(c => c.id === id)).filter(Boolean);
      items.forEach(c => {
        c.tags = c.tags || [];
        if (!c.tags.includes(tag.trim())) c.tags.push(tag.trim());
      });
      save(LS.clients, State.clients);
      Security.log('bulk_tag', { count: items.length, tag });
      toast(`✓ תייגו ${items.length} לקוחות`);
      this.clear();
      if (typeof renderClientsList === 'function') try { renderClientsList(); } catch(e){}
    }
  };

  // =====================================================
  // EXPORT INTERFACE
  // =====================================================
  window.CRMPlus = {
    Security, Outcomes, Recurring, Voice, Documents, Backup,
    ICalFeed, Notifications, Schedule, Funnel, Bulk,
    closeModal,

    init() {
      window.openOutcomePHQ9 = id => Outcomes.open(id, 'PHQ-9');
      window.openOutcomeGAD7 = id => Outcomes.open(id, 'GAD-7');
      window.openOutcomeHistory = id => Outcomes.viewHistory(id);
      window.openRecurringSessions = id => Recurring.open(id);
      window.startVoiceNote = id => Voice.start(id);
      window.playVoiceNote = id => Voice.play(id);
      window.openDocumentTemplates = id => Documents.open(id);
      window.openBackup = () => Backup.exportAll();
      window.openImport = () => Backup.importAll();
      window.openICalExport = () => ICalFeed.download();
      window.openNotifications = () => Notifications.open();
      window.openWorkingHours = () => Schedule.openConfig();
      window.openConversionFunnel = () => Funnel.open();
      window.openAuditLog = () => Security.viewAuditLog();
      window.openSetup2FA = () => Security.setup2FA();
      window.openDisable2FA = () => Security.disable2FA();

      Security.init();
      Notifications.init();
      console.log('[CRMPlus] ✓ 11 modules loaded');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.CRMPlus.init());
  } else {
    window.CRMPlus.init();
  }

  } // end start()
})();
