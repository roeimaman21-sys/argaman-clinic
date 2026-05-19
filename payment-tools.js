/* =====================================================
   payment-tools.js — Payment link generators (Bit, PayBox)
   ===================================================== */
(function(){
  'use strict';

  /** Generate a Bit payment link */
  function bitLink(phone, amount, description){
    // Bit uses tel-like format. Phone should be 05X or 9725XX.
    const cleaned = String(phone||'').replace(/[^0-9]/g,'');
    let intl = cleaned;
    if (intl.startsWith('0')) intl = '972' + intl.slice(1);
    if (!intl.startsWith('972')) intl = '972' + intl;
    // Bit's universal link format
    return `https://www.bitpay.co.il/app/me/${intl}?amount=${encodeURIComponent(amount)}&description=${encodeURIComponent(description||'תשלום קליניקת ארגמן')}`;
  }

  /** Generate a PayBox payment link */
  function payboxLink(phone, amount, description){
    const cleaned = String(phone||'').replace(/[^0-9]/g,'');
    let intl = cleaned;
    if (intl.startsWith('0')) intl = '972' + intl.slice(1);
    return `https://link.payboxapp.com/getPaid?recipient=${intl}&amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(description||'תשלום קליניקת ארגמן')}`;
  }

  /** Open WhatsApp with a payment-request message */
  function sendPaymentRequestViaWA(toPhone, amount, description, method){
    const link = method === 'paybox' ? payboxLink(toPhone, amount, description) : bitLink(toPhone, amount, description);
    const msg = `שלום,\n\nתשלום עבור: ${description||'פגישה'}\nסכום: ₪${amount}\n\nלתשלום מהיר:\n${link}\n\nתודה,\nגל ממן · קליניקת ארגמן`;
    const cleaned = String(toPhone||'').replace(/[^0-9]/g,'');
    let intl = cleaned;
    if (intl.startsWith('0')) intl = '972' + intl.slice(1);
    const waUrl = `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    if (window.Audit) window.Audit.logAction('export','payment',null,`Request ₪${amount} via ${method||'bit'}`);
  }

  /** Show modal for requesting payment for a session */
  function requestPaymentModal(sessionId){
    const State = window.State;
    if (!State) return;
    const s = (State.sessions || []).find(x => x.id === sessionId);
    if (!s){ window.toast && window.toast('פגישה לא נמצאה','error'); return; }
    const client = (State.clients || []).find(c => c.id === s.clientId);
    const phone = client?.phone || s.phone || '';
    const amount = s.price || '';
    const desc = s.title || `פגישה ${s.date || ''}`;
    const html = `
      <div class="modal-content" style="max-width:480px">
        <h2 style="color:var(--navy);margin-bottom:1rem">💰 בקשת תשלום</h2>
        <label style="display:block;margin-bottom:.4rem;font-weight:600">טלפון</label>
        <input id="pay-phone" value="${(phone||'').replace(/"/g,'&quot;')}" style="width:100%;padding:.6rem;border:1px solid #d1d5db;border-radius:6px;margin-bottom:.75rem">
        <label style="display:block;margin-bottom:.4rem;font-weight:600">סכום (₪)</label>
        <input id="pay-amount" type="number" value="${amount}" style="width:100%;padding:.6rem;border:1px solid #d1d5db;border-radius:6px;margin-bottom:.75rem">
        <label style="display:block;margin-bottom:.4rem;font-weight:600">פירוט</label>
        <input id="pay-desc" value="${(desc||'').replace(/"/g,'&quot;')}" style="width:100%;padding:.6rem;border:1px solid #d1d5db;border-radius:6px;margin-bottom:1rem">
        <div style="display:flex;flex-direction:column;gap:.5rem">
          <button class="btn btn-gold" onclick="sendPay('${sessionId}','bit')">💳 שלח קישור Bit ב-WhatsApp</button>
          <button class="btn" style="background:#0EA5E9;color:#fff" onclick="sendPay('${sessionId}','paybox')">💰 שלח קישור PayBox ב-WhatsApp</button>
          <button class="btn" onclick="markPaid('${sessionId}')" style="background:#16a34a;color:#fff">✅ סמן כשולם (ידני)</button>
          <button class="btn" onclick="closeModal()">ביטול</button>
        </div>
      </div>`;
    window.modal && window.modal(html);
  }

  function sendPay(sessionId, method){
    const phone = document.getElementById('pay-phone').value.trim();
    const amount = document.getElementById('pay-amount').value.trim();
    const desc = document.getElementById('pay-desc').value.trim();
    if (!phone || !amount){ window.toast && window.toast('יש למלא טלפון וסכום','error'); return; }
    sendPaymentRequestViaWA(phone, amount, desc, method);
    window.closeModal && window.closeModal();
  }

  function markPaid(sessionId){
    const State = window.State;
    if (!State) return;
    const s = (State.sessions || []).find(x => x.id === sessionId);
    if (!s) return;
    s.paid = true;
    s.paidAt = new Date().toISOString();
    if (typeof window.save === 'function' && window.LS) window.save(window.LS.sessions, State.sessions);
    if (typeof window.logActivity === 'function') window.logActivity(`עודכנה פגישה: ${s.title || s.date} (שולם)`);
    window.toast && window.toast('✅ סומן כשולם','success');
    window.closeModal && window.closeModal();
    if (window.renderers && window.currentSection && window.renderers[window.currentSection]) {
      try { window.renderers[window.currentSection](); } catch(_){}
    }
  }

  // Expose — dual pattern
  const PaymentAPI = { bitLink, payboxLink, sendPaymentRequestViaWA, requestPaymentModal };
  window.PaymentTools = PaymentAPI;
  window.requestPayment = requestPaymentModal;
  window.sendPay = sendPay;
  window.markPaid = markPaid;
  if (window.CRM && window.CRM.register) window.CRM.register('PaymentTools', PaymentAPI);
})();
