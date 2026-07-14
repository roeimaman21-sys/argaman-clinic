/* =====================================================
   clinical-suite.js — Clinical Modules for CRM
   קליניקת ארגמן · ניהול קליני מתקדם
   ─────────────────────────────────────────────────────
   Modules:
   A. Session Notes (SOAP + Methods + Risk flags)
   B. Calendar View (month/week visual)
   C. Financial Dashboard (revenue/debts/tax export)
   D. Client Enrichment (goals/family/timeline)
   ─────────────────────────────────────────────────────
   Integrates with existing State + save() + modal()
   Uses existing AES-256 encryption (sessions key)
   ===================================================== */
(function(){
  'use strict';

  // Wait for State to be defined by admin.html before initializing
  function waitForState(attempts) {
    if (typeof State !== 'undefined') return start();
    if (attempts > 60) return console.warn('[ClinicalSuite] State never appeared');
    setTimeout(() => waitForState(attempts+1), 250);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForState(0));
  } else {
    waitForState(0);
  }

  function start(){
  // ─── Constants ───
  const METHODS = [
    { k:'flash', l:'FLASH', c:'#8B4C8C' },
    { k:'emdr',  l:'EMDR',  c:'#5D1A3F' },
    { k:'cbt',   l:'CBT',   c:'#1B3A6B' },
    { k:'ifs',   l:'IFS',   c:'#2d6a4f' },
    { k:'eft',   l:'EFT',   c:'#C9A84C' },
    { k:'gottman', l:'Gottman', c:'#6B4C1B' },
    { k:'somatic', l:'סומטי', c:'#2C5F6B' },
    { k:'inner-child', l:'ילד פנימי', c:'#3D1B6B' },
    { k:'mindfulness', l:'מיינדפולנס', c:'#3a8a99' },
    { k:'psychodynamic', l:'פסיכודינמי', c:'#52b788' },
    { k:'other', l:'אחר', c:'#6b7280' },
  ];
  const RISK_FLAGS = [
    { k:'suicidal', l:'🚨 רעיונות אובדניים', c:'#dc2626' },
    { k:'selfharm', l:'⚠️ פגיעה עצמית', c:'#ea580c' },
    { k:'abuse-victim', l:'⚠️ קורבן התעללות', c:'#dc2626' },
    { k:'abuse-perp', l:'⚠️ מבצע התעללות', c:'#dc2626' },
    { k:'substance', l:'⚠️ שימוש בחומרים', c:'#ea580c' },
    { k:'eating-disorder', l:'⚠️ הפרעת אכילה', c:'#ea580c' },
    { k:'dissociation', l:'⚠️ דיסוציאציה', c:'#7c3aed' },
    { k:'crisis', l:'🚨 משבר חריף', c:'#dc2626' },
    { k:'stable', l:'✅ יציב', c:'#16a34a' },
  ];

  // ─── Helpers ───
  const $ = (s, root) => (root||document).querySelector(s);
  const $$ = (s, root) => Array.from((root||document).querySelectorAll(s));
  const esc = s => String(s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = d => { const x = new Date(d); return isNaN(x) ? '—' : x.toLocaleDateString('he-IL'); };
  const fmtTime = t => t || '—';
  const todayISO = () => new Date().toISOString().slice(0,10);
  const monthISO = (d) => { const x = d instanceof Date ? d : new Date(d); return x.toISOString().slice(0,7); };
  const ils = n => '₪' + Number(n||0).toLocaleString('he-IL');

  function getModal() {
    // Prefer openModal(title, content, opts) — has the right signature
    if (typeof openModal === 'function') return openModal;
    // Fallback to modal(html, opts) — adapt signature
    if (typeof modal === 'function') return (title, content, opts) => modal(content, Object.assign({ title, size:'lg' }, opts||{}));
    return (t,h) => alert(t + '\n' + (h||'').replace(/<[^>]+>/g,' ').slice(0,500));
  }
  function showToast(msg, type='success') {
    if (typeof toast === 'function') return toast(msg, type);
    console.log('[ClinicalSuite]', msg);
  }
  function closeModalSafe() {
    if (typeof closeModal === 'function') return closeModal();
    document.querySelectorAll('.modal-bg, .modal-backdrop, .modal-overlay').forEach(m => m.remove());
  }

  // =====================================================
  // MODULE A: SESSION NOTES (SOAP)
  // =====================================================
  const SessionNotes = {
    open(sessionId) {
      const sess = (State.sessions||[]).find(s => s.id === sessionId);
      if (!sess) return showToast('פגישה לא נמצאה', 'error');
      const client = (State.clients||[]).find(c => c.id === sess.clientId) || {};
      const n = sess.notesData || {};
      const methodsSelected = n.methods || [];
      const risksSelected = n.risks || [];

      const html = `
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div style="background:#f9fafb;padding:.75rem 1rem;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
            <div>
              <strong>${esc(client.name||'לקוח')}</strong>
              <span style="color:#6b7280;margin-right:.5rem">${fmt(sess.date)} ${fmtTime(sess.time)}</span>
            </div>
            <div style="font-size:.8rem;color:#6b7280">${n.savedAt ? 'נשמר: '+fmt(n.savedAt) : 'רשומה חדשה'}</div>
          </div>

          <!-- Risk flags FIRST (clinical priority) -->
          <div>
            <label style="font-weight:700;color:#1B3A6B;display:block;margin-bottom:.4rem">🚨 דגלי סיכון</label>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem">
              ${RISK_FLAGS.map(r => `
                <label style="display:inline-flex;align-items:center;gap:.25rem;padding:.3rem .6rem;background:${risksSelected.includes(r.k)?r.c+'22':'#f3f4f6'};border:1px solid ${risksSelected.includes(r.k)?r.c:'#e5e7eb'};border-radius:50px;cursor:pointer;font-size:.85rem;color:${risksSelected.includes(r.k)?r.c:'#374151'}">
                  <input type="checkbox" data-risk="${r.k}" ${risksSelected.includes(r.k)?'checked':''} style="margin:0">
                  ${r.l}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- SOAP fields -->
          <div style="display:grid;grid-template-columns:1fr;gap:.75rem">
            <div>
              <label style="font-weight:700;color:#1B3A6B">S — Subjective <small style="color:#6b7280;font-weight:400">(מה הלקוח אמר/הרגיש)</small></label>
              <textarea id="sn-s" rows="3" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:.95rem;margin-top:.25rem">${esc(n.s||'')}</textarea>
            </div>
            <div>
              <label style="font-weight:700;color:#1B3A6B">O — Objective <small style="color:#6b7280;font-weight:400">(תצפיות, התנהגות, מצב)</small></label>
              <textarea id="sn-o" rows="3" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:.95rem;margin-top:.25rem">${esc(n.o||'')}</textarea>
            </div>
            <div>
              <label style="font-weight:700;color:#1B3A6B">A — Assessment <small style="color:#6b7280;font-weight:400">(הערכה קלינית, נושאים מרכזיים)</small></label>
              <textarea id="sn-a" rows="3" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:.95rem;margin-top:.25rem">${esc(n.a||'')}</textarea>
            </div>
            <div>
              <label style="font-weight:700;color:#1B3A6B">P — Plan <small style="color:#6b7280;font-weight:400">(תוכנית להמשך, התערבויות)</small></label>
              <textarea id="sn-p" rows="3" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:.95rem;margin-top:.25rem">${esc(n.p||'')}</textarea>
            </div>
          </div>

          <!-- Methods used -->
          <div>
            <label style="font-weight:700;color:#1B3A6B;display:block;margin-bottom:.4rem">שיטות שיושמו</label>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem">
              ${METHODS.map(m => `
                <label style="display:inline-flex;align-items:center;gap:.25rem;padding:.3rem .6rem;background:${methodsSelected.includes(m.k)?m.c+'22':'#f3f4f6'};border:1px solid ${methodsSelected.includes(m.k)?m.c:'#e5e7eb'};border-radius:50px;cursor:pointer;font-size:.85rem;color:${methodsSelected.includes(m.k)?m.c:'#374151'}">
                  <input type="checkbox" data-method="${m.k}" ${methodsSelected.includes(m.k)?'checked':''} style="margin:0">
                  ${m.l}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Homework + Next focus -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
            <div>
              <label style="font-weight:700;color:#1B3A6B">📚 שיעורי בית</label>
              <textarea id="sn-hw" rows="2" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:.95rem;margin-top:.25rem">${esc(n.homework||'')}</textarea>
            </div>
            <div>
              <label style="font-weight:700;color:#1B3A6B">🎯 פוקוס לפגישה הבאה</label>
              <textarea id="sn-nf" rows="2" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:.95rem;margin-top:.25rem">${esc(n.nextFocus||'')}</textarea>
            </div>
          </div>

          <div style="display:flex;gap:.5rem;justify-content:flex-end;padding-top:.5rem;border-top:1px solid #e5e7eb;flex-wrap:wrap">
            <button class="btn" onclick="ClinicalSuite.SessionNotes.print('${sessionId}')" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">🖨️ הדפס</button>
            <button class="btn btn-primary" onclick="ClinicalSuite.SessionNotes.save('${sessionId}')" style="padding:.5rem 1.25rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">💾 שמור רשומה</button>
          </div>
        </div>
      `;
      getModal()('📔 רשומת פגישה — SOAP', html, { size:'xl' });
    },

    save(sessionId) {
      const sess = (State.sessions||[]).find(s => s.id === sessionId);
      if (!sess) return showToast('פגישה לא נמצאה', 'error');
      const methods = $$('input[data-method]:checked').map(el => el.dataset.method);
      const risks = $$('input[data-risk]:checked').map(el => el.dataset.risk);
      sess.notesData = {
        s: $('#sn-s').value.trim(),
        o: $('#sn-o').value.trim(),
        a: $('#sn-a').value.trim(),
        p: $('#sn-p').value.trim(),
        homework: $('#sn-hw').value.trim(),
        nextFocus: $('#sn-nf').value.trim(),
        methods, risks,
        savedAt: new Date().toISOString()
      };
      sess.hasNotes = true;
      save(LS.sessions, State.sessions);
      showToast('רשומה נשמרה ✓');
      // Close modal if exists
      closeModalSafe();
      // Refresh sessions view if open
      if (typeof renderSessionsView === 'function' && document.getElementById('sessions-view')) {
        try { renderSessionsView('list'); } catch(e){}
      }
    },

    print(sessionId) {
      const sess = (State.sessions||[]).find(s => s.id === sessionId);
      if (!sess) return;
      const client = (State.clients||[]).find(c => c.id === sess.clientId) || {};
      const n = sess.notesData || {};
      const w = window.open('', '_blank', 'width=800,height=900');
      w.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>רשומת פגישה — ${esc(client.name||'')}</title><style>
        body{font-family:Heebo,Arial,sans-serif;max-width:700px;margin:2rem auto;padding:0 1rem;line-height:1.7;color:#1f2937}
        h1{color:#1B3A6B;border-bottom:3px solid #C9A84C;padding-bottom:.5rem}
        h2{color:#1B3A6B;font-size:1.1rem;margin-top:1.5rem;margin-bottom:.25rem}
        .meta{background:#f3f4f6;padding:.75rem;border-radius:6px;margin:1rem 0}
        .field{background:#f9fafb;border-right:3px solid #1B3A6B;padding:.5rem .75rem;margin:.5rem 0;border-radius:0 6px 6px 0}
        .risks{color:#dc2626;font-weight:700;padding:.5rem;background:#fee2e2;border-radius:6px}
        .methods{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem}
        .methods span{background:#1B3A6B;color:#fff;padding:.2rem .6rem;border-radius:50px;font-size:.85rem}
        footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e5e7eb;color:#6b7280;font-size:.85rem;text-align:center}
        @media print{body{margin:0;padding:1rem}}
      </style></head><body>
        <h1>רשומת פגישה — SOAP</h1>
        <div class="meta">
          <strong>לקוח:</strong> ${esc(client.name||'—')}<br>
          <strong>תאריך:</strong> ${fmt(sess.date)} ${fmtTime(sess.time)}<br>
          ${n.savedAt ? `<strong>נשמר:</strong> ${fmt(n.savedAt)}` : ''}
        </div>
        ${n.risks && n.risks.length ? `<div class="risks">דגלים: ${n.risks.map(k => RISK_FLAGS.find(r=>r.k===k)?.l||k).join(' · ')}</div>` : ''}
        <h2>S — Subjective</h2><div class="field">${esc(n.s||'').replace(/\n/g,'<br>') || '<em>ריק</em>'}</div>
        <h2>O — Objective</h2><div class="field">${esc(n.o||'').replace(/\n/g,'<br>') || '<em>ריק</em>'}</div>
        <h2>A — Assessment</h2><div class="field">${esc(n.a||'').replace(/\n/g,'<br>') || '<em>ריק</em>'}</div>
        <h2>P — Plan</h2><div class="field">${esc(n.p||'').replace(/\n/g,'<br>') || '<em>ריק</em>'}</div>
        ${n.methods && n.methods.length ? `<h2>שיטות שיושמו</h2><div class="methods">${n.methods.map(k => `<span>${METHODS.find(m=>m.k===k)?.l||k}</span>`).join('')}</div>` : ''}
        ${n.homework ? `<h2>שיעורי בית</h2><div class="field">${esc(n.homework).replace(/\n/g,'<br>')}</div>` : ''}
        ${n.nextFocus ? `<h2>פוקוס לפגישה הבאה</h2><div class="field">${esc(n.nextFocus).replace(/\n/g,'<br>')}</div>` : ''}
        <footer>קליניקת ארגמן · גל ממן · רשומה חסויה לשימוש מקצועי</footer>
        <script>window.print()</`+`script>
      </body></html>`);
      w.document.close();
    }
  };

  // =====================================================
  // MODULE B: CALENDAR VIEW
  // =====================================================
  const CalendarView = {
    currentMonth: new Date(),

    render(container) {
      const root = typeof container === 'string' ? document.getElementById(container) : container;
      if (!root) return;
      const m = this.currentMonth;
      const year = m.getFullYear(), month = m.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month+1, 0);
      const startDay = first.getDay(); // 0=Sun
      const daysInMonth = last.getDate();
      const monthName = m.toLocaleDateString('he-IL', { month:'long', year:'numeric' });

      // Group sessions by date
      const sessByDate = {};
      (State.sessions||[]).forEach(s => {
        if (!s.date) return;
        (sessByDate[s.date] = sessByDate[s.date] || []).push(s);
      });

      // Build cells
      let cells = '';
      // Empty cells before first day
      for (let i = 0; i < startDay; i++) cells += '<div class="cal-cell cal-empty"></div>';
      for (let d = 1; d <= daysInMonth; d++) {
        const dateISO = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const sessions = sessByDate[dateISO] || [];
        const isToday = dateISO === todayISO();
        const isWeekend = new Date(year, month, d).getDay() === 6; // Saturday
        cells += `
          <div class="cal-cell ${isToday?'cal-today':''} ${isWeekend?'cal-weekend':''}" data-date="${dateISO}">
            <div class="cal-day-num">${d}</div>
            ${sessions.slice(0,4).map(s => {
              const c = (State.clients||[]).find(x=>x.id===s.clientId)||{};
              const stat = s.status || 'scheduled';
              const color = stat==='completed' ? '#16a34a' : stat==='cancelled' ? '#9ca3af' : stat==='no-show' ? '#dc2626' : '#1B3A6B';
              return `<div class="cal-event" style="border-right:3px solid ${color}" onclick="event.stopPropagation();ClinicalSuite.SessionNotes.open('${s.id}')" title="${esc(c.name||'')} ${fmtTime(s.time)}">
                <span class="cal-time">${esc(s.time||'')}</span> ${esc(c.name||'—').slice(0,12)}
              </div>`;
            }).join('')}
            ${sessions.length > 4 ? `<div class="cal-more">+ ${sessions.length-4} עוד</div>` : ''}
          </div>
        `;
      }

      // Day headers
      const days = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

      root.innerHTML = `
        <style>
          .cal-wrap{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
          .cal-header{display:flex;justify-content:space-between;align-items:center;padding:1rem;background:#1B3A6B;color:#fff}
          .cal-header h3{margin:0;color:#fff;font-size:1.2rem}
          .cal-nav-btn{background:rgba(255,255,255,.2);color:#fff;border:0;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem;font-family:inherit}
          .cal-nav-btn:hover{background:rgba(255,255,255,.3)}
          .cal-days{display:grid;grid-template-columns:repeat(7,1fr);background:#f9fafb;border-bottom:1px solid #e5e7eb}
          .cal-day-head{padding:.5rem;text-align:center;font-weight:700;color:#1B3A6B;font-size:.85rem}
          .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);background:#e5e7eb;gap:1px}
          .cal-cell{background:#fff;min-height:90px;padding:.35rem;cursor:pointer;position:relative;overflow:hidden;transition:background .15s}
          .cal-cell:hover{background:#f9fafb}
          .cal-empty{background:#f3f4f6;cursor:default}
          .cal-today{background:#eff6ff;border:2px solid #1B3A6B}
          .cal-weekend{background:#fafafa}
          .cal-day-num{font-weight:700;color:#1B3A6B;font-size:.9rem;margin-bottom:.25rem}
          .cal-event{background:#eff6ff;padding:.15rem .4rem;border-radius:4px;font-size:.7rem;margin-bottom:.15rem;color:#1f2937;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .cal-event:hover{background:#dbeafe}
          .cal-time{color:#6b7280;font-weight:600;margin-left:.25rem}
          .cal-more{font-size:.7rem;color:#6b7280;font-weight:600;margin-top:.15rem}
          @media (max-width:768px){
            .cal-cell{min-height:60px;padding:.2rem}
            .cal-event{font-size:.6rem;padding:.1rem .2rem}
            .cal-day-num{font-size:.8rem}
          }
        </style>
        <div class="cal-wrap">
          <div class="cal-header">
            <button class="cal-nav-btn" onclick="ClinicalSuite.CalendarView.prev()">‹</button>
            <h3>${monthName}</h3>
            <div>
              <button class="cal-nav-btn" onclick="ClinicalSuite.CalendarView.today()" style="width:auto;padding:0 .75rem;border-radius:8px;font-size:.85rem">היום</button>
              <button class="cal-nav-btn" onclick="ClinicalSuite.CalendarView.next()">›</button>
            </div>
          </div>
          <div class="cal-days">
            ${days.map(d => `<div class="cal-day-head">${d}</div>`).join('')}
          </div>
          <div class="cal-grid">${cells}</div>
        </div>
        <div style="margin-top:.75rem;font-size:.8rem;color:#6b7280;display:flex;gap:1rem;flex-wrap:wrap">
          <span><span style="display:inline-block;width:10px;height:10px;background:#1B3A6B;border-radius:50%"></span> מתוכננת</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:#16a34a;border-radius:50%"></span> הסתיימה</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:#dc2626;border-radius:50%"></span> Did not show</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:#9ca3af;border-radius:50%"></span> בוטלה</span>
        </div>
      `;

      // Click cell to add session
      $$('.cal-cell:not(.cal-empty)', root).forEach(cell => {
        cell.addEventListener('click', e => {
          if (e.target.closest('.cal-event')) return;
          const date = cell.dataset.date;
          if (typeof addSessionModal === 'function') {
            addSessionModal(null, { date });
          }
        });
      });
    },

    prev() { this.currentMonth.setMonth(this.currentMonth.getMonth()-1); this.render('clinical-calendar-root'); },
    next() { this.currentMonth.setMonth(this.currentMonth.getMonth()+1); this.render('clinical-calendar-root'); },
    today() { this.currentMonth = new Date(); this.render('clinical-calendar-root'); }
  };

  // =====================================================
  // MODULE C: FINANCIAL DASHBOARD
  // =====================================================
  const Financial = {
    render(container) {
      const root = typeof container === 'string' ? document.getElementById(container) : container;
      if (!root) return;

      const now = new Date();
      const thisMonth = monthISO(now);
      const thisYear = now.getFullYear();
      const sessions = State.sessions || [];

      // Calculate metrics
      const completedSessions = sessions.filter(s => s.status === 'completed');
      const paidSessions = completedSessions.filter(s => s.paid);
      const unpaidSessions = completedSessions.filter(s => !s.paid && s.price);

      const revenueThisMonth = paidSessions
        .filter(s => monthISO(s.date) === thisMonth)
        .reduce((sum,s) => sum + (Number(s.price)||0), 0);

      const revenueThisYear = paidSessions
        .filter(s => new Date(s.date).getFullYear() === thisYear)
        .reduce((sum,s) => sum + (Number(s.price)||0), 0);

      const outstandingTotal = unpaidSessions.reduce((sum,s) => sum + (Number(s.price)||0), 0);

      // Monthly revenue chart data (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const m = monthISO(d);
        const rev = paidSessions.filter(s => monthISO(s.date)===m).reduce((sum,s) => sum + (Number(s.price)||0), 0);
        monthlyData.push({ month: d.toLocaleDateString('he-IL', {month:'short'}), rev });
      }
      const maxRev = Math.max(...monthlyData.map(d=>d.rev), 1);

      // Top clients by revenue
      const clientRevenue = {};
      paidSessions.forEach(s => {
        clientRevenue[s.clientId] = (clientRevenue[s.clientId]||0) + (Number(s.price)||0);
      });
      const topClients = Object.entries(clientRevenue)
        .sort((a,b) => b[1]-a[1])
        .slice(0,5)
        .map(([id,rev]) => ({ client: (State.clients||[]).find(c=>c.id===id), rev }));

      // Outstanding clients
      const outstandingByClient = {};
      unpaidSessions.forEach(s => {
        outstandingByClient[s.clientId] = (outstandingByClient[s.clientId]||0) + (Number(s.price)||0);
      });
      const debtors = Object.entries(outstandingByClient)
        .sort((a,b) => b[1]-a[1])
        .map(([id,debt]) => ({ client: (State.clients||[]).find(c=>c.id===id), debt }))
        .filter(x => x.client);

      // Service-type breakdown
      const byType = {};
      paidSessions.filter(s => new Date(s.date).getFullYear() === thisYear).forEach(s => {
        const c = (State.clients||[]).find(x=>x.id===s.clientId);
        const t = c?.type || 'אחר';
        byType[t] = (byType[t]||0) + (Number(s.price)||0);
      });

      root.innerHTML = `
        <style>
          .fin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem}
          .fin-card{background:linear-gradient(135deg,#fff,#f9fafb);border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem}
          .fin-card-label{color:#6b7280;font-size:.85rem;margin-bottom:.25rem}
          .fin-card-value{color:#1B3A6B;font-size:1.8rem;font-weight:800;line-height:1}
          .fin-card-sub{color:#6b7280;font-size:.8rem;margin-top:.4rem}
          .fin-section{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
          .fin-section h3{color:#1B3A6B;margin:0 0 1rem;font-size:1.05rem;border-bottom:2px solid #C9A84C;padding-bottom:.4rem}
          .fin-bar{height:160px;display:flex;align-items:flex-end;gap:.5rem;padding:0 .5rem}
          .fin-bar-item{flex:1;display:flex;flex-direction:column;align-items:center;height:100%}
          .fin-bar-fill{width:100%;background:linear-gradient(180deg,#C9A84C,#1B3A6B);border-radius:6px 6px 0 0;min-height:4px;transition:all .3s;position:relative}
          .fin-bar-val{position:absolute;top:-1.5rem;left:50%;transform:translateX(-50%);font-size:.75rem;font-weight:700;color:#1B3A6B;white-space:nowrap}
          .fin-bar-label{font-size:.75rem;color:#6b7280;margin-top:.25rem}
          .fin-list{list-style:none;padding:0;margin:0}
          .fin-list li{padding:.6rem 0;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center}
          .fin-list li:last-child{border-bottom:0}
          .fin-debt{color:#dc2626;font-weight:700}
        </style>

        <div class="fin-grid">
          <div class="fin-card">
            <div class="fin-card-label">💰 הכנסות החודש</div>
            <div class="fin-card-value">${ils(revenueThisMonth)}</div>
            <div class="fin-card-sub">${paidSessions.filter(s=>monthISO(s.date)===thisMonth).length} פגישות ששולמו</div>
          </div>
          <div class="fin-card">
            <div class="fin-card-label">📅 הכנסות ${thisYear}</div>
            <div class="fin-card-value">${ils(revenueThisYear)}</div>
            <div class="fin-card-sub">${paidSessions.filter(s=>new Date(s.date).getFullYear()===thisYear).length} פגישות מתחילת השנה</div>
          </div>
          <div class="fin-card" style="border-color:${outstandingTotal>0?'#dc2626':'#e5e7eb'}">
            <div class="fin-card-label">⚠️ חובות פתוחים</div>
            <div class="fin-card-value" style="color:${outstandingTotal>0?'#dc2626':'#16a34a'}">${ils(outstandingTotal)}</div>
            <div class="fin-card-sub">${unpaidSessions.length} פגישות לא שולמו</div>
          </div>
          <div class="fin-card">
            <div class="fin-card-label">📊 ממוצע פגישה</div>
            <div class="fin-card-value">${ils(paidSessions.length ? Math.round(revenueThisYear/paidSessions.filter(s=>new Date(s.date).getFullYear()===thisYear).length) : 0)}</div>
            <div class="fin-card-sub">מבוסס על השנה</div>
          </div>
        </div>

        <div class="fin-section">
          <h3>📈 מגמת הכנסות — 6 חודשים אחרונים</h3>
          <div class="fin-bar">
            ${monthlyData.map(d => `
              <div class="fin-bar-item">
                <div style="height:100%;display:flex;flex-direction:column;justify-content:flex-end;width:100%;position:relative">
                  <div class="fin-bar-fill" style="height:${(d.rev/maxRev*100).toFixed(0)}%">
                    ${d.rev > 0 ? `<div class="fin-bar-val">${ils(d.rev).replace('₪','₪ ')}</div>` : ''}
                  </div>
                </div>
                <div class="fin-bar-label">${d.month}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem">
          <div class="fin-section">
            <h3>🏆 לקוחות מובילים</h3>
            ${topClients.length ? `<ul class="fin-list">${topClients.map(x => `
              <li><span>${esc(x.client?.name||'—')}</span><strong>${ils(x.rev)}</strong></li>
            `).join('')}</ul>` : '<p style="color:#6b7280">אין נתונים עדיין</p>'}
          </div>

          <div class="fin-section">
            <h3>⚠️ חובות לגבייה</h3>
            ${debtors.length ? `<ul class="fin-list">${debtors.map(x => `
              <li>
                <span>${esc(x.client?.name||'—')}<br><small style="color:#6b7280">${esc(x.client?.phone||'')}</small></span>
                <span class="fin-debt">${ils(x.debt)}</span>
              </li>
            `).join('')}</ul>` : '<p style="color:#16a34a">✅ אין חובות פתוחים</p>'}
          </div>

          <div class="fin-section">
            <h3>📊 הכנסות לפי סוג שירות (${thisYear})</h3>
            ${Object.keys(byType).length ? `<ul class="fin-list">${Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([t,v]) => `
              <li><span>${esc(t)}</span><strong>${ils(v)}</strong></li>
            `).join('')}</ul>` : '<p style="color:#6b7280">אין נתונים</p>'}
          </div>
        </div>

        <div class="fin-section">
          <h3>📤 ייצוא וגיבוי</h3>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button onclick="ClinicalSuite.Financial.exportTax()" style="padding:.6rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">📊 ייצוא CSV למס הכנסה (${thisYear})</button>
            <button onclick="ClinicalSuite.Financial.exportYear(${thisYear-1})" style="padding:.6rem 1rem;background:#6b7280;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">📊 ייצוא ${thisYear-1}</button>
            <button onclick="ClinicalSuite.Financial.reminderDebtors()" style="padding:.6rem 1rem;background:#C9A84C;color:#1B3A6B;border:0;border-radius:8px;cursor:pointer;font-weight:700">📱 שלח תזכורות חוב (${debtors.length})</button>
          </div>
        </div>
      `;
    },

    exportTax(year) {
      year = year || new Date().getFullYear();
      const sessions = (State.sessions||[]).filter(s =>
        s.status === 'completed' && s.paid && new Date(s.date).getFullYear() === year
      );
      const rows = [['תאריך','לקוח','סוג','שיטת תשלום','סכום','חשבונית #']];
      sessions.forEach(s => {
        const c = (State.clients||[]).find(x=>x.id===s.clientId)||{};
        rows.push([
          s.date,
          c.name||'',
          c.type||'',
          s.paymentMethod||'',
          s.price||'',
          s.invoiceNumber||''
        ]);
      });
      const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax_export_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`יוצא ${sessions.length} פגישות`);
    },

    exportYear(year) { this.exportTax(year); },

    reminderDebtors() {
      const sessions = (State.sessions||[]).filter(s => s.status==='completed' && !s.paid && s.price);
      const byClient = {};
      sessions.forEach(s => {
        if (!byClient[s.clientId]) byClient[s.clientId] = [];
        byClient[s.clientId].push(s);
      });
      const links = Object.entries(byClient).map(([id, sess]) => {
        const c = (State.clients||[]).find(x=>x.id===id);
        if (!c || !c.phone) return null;
        const total = sess.reduce((sum,s) => sum + Number(s.price||0), 0);
        const phone = c.phone.replace(/\D/g,'').replace(/^0/, '972');
        const msg = encodeURIComponent(`שלום ${c.name?.split(' ')[0]||''}, תזכורת ידידותית — יש חוב פתוח של ${ils(total)} עבור ${sess.length} פגישות. אשמח לתאם תשלום. תודה! גל`);
        return { name: c.name, phone, link: `https://wa.me/${phone}?text=${msg}`, total };
      }).filter(Boolean);
      if (!links.length) return showToast('אין חובות פתוחים', 'success');
      const html = `
        <p>בחרו לקוח לשלוח תזכורת בוואטסאפ:</p>
        <ul style="list-style:none;padding:0">
          ${links.map(x => `
            <li style="padding:.75rem;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:.5rem;display:flex;justify-content:space-between;align-items:center">
              <span><strong>${esc(x.name)}</strong> · <span style="color:#dc2626">${ils(x.total)}</span></span>
              <a href="${x.link}" target="_blank" rel="noopener" style="background:#25D366;color:#fff;padding:.4rem .9rem;border-radius:50px;text-decoration:none;font-weight:600;font-size:.85rem">📱 שלח</a>
            </li>
          `).join('')}
        </ul>
      `;
      getModal()('תזכורות חוב', html, { size:'md' });
    }
  };

  // =====================================================
  // MODULE D: CLIENT ENRICHMENT (Goals + Family + Timeline)
  // =====================================================
  const ClientEnrichment = {
    openTreatmentPlan(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return;
      c.treatment = c.treatment || { goals:[], plan:'', primaryMethod:'', startedAt: todayISO() };
      const t = c.treatment;

      const html = `
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div>
            <label style="font-weight:700;color:#1B3A6B">🎯 יעדי הליווי</label>
            <small style="color:#6b7280;display:block;margin-bottom:.5rem">הוסיפו 3-5 יעדים מדידים</small>
            <div id="goals-list">
              ${(t.goals||[]).map((g,i) => `
                <div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem">
                  <input type="text" data-goal-text="${i}" value="${esc(g.text||'')}" placeholder="לדוגמה: לתקשר ללא העלאת קול" style="flex:1;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
                  <select data-goal-status="${i}" style="padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
                    <option value="active" ${g.status==='active'?'selected':''}>פעיל</option>
                    <option value="progress" ${g.status==='progress'?'selected':''}>בהתקדמות</option>
                    <option value="achieved" ${g.status==='achieved'?'selected':''}>הושג ✓</option>
                  </select>
                  <button onclick="ClinicalSuite.ClientEnrichment.removeGoal('${clientId}',${i})" style="background:#fee2e2;color:#dc2626;border:0;border-radius:6px;width:32px;height:32px;cursor:pointer">✕</button>
                </div>
              `).join('')}
            </div>
            <button onclick="ClinicalSuite.ClientEnrichment.addGoal('${clientId}')" style="background:#eff4ff;color:#1B3A6B;border:1px dashed #1B3A6B;border-radius:6px;padding:.4rem .8rem;cursor:pointer;font-weight:600;font-size:.85rem">+ הוסף יעד</button>
          </div>

          <div>
            <label style="font-weight:700;color:#1B3A6B">🧭 שיטה ראשית</label>
            <select id="tp-method" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;margin-top:.25rem">
              <option value="">— בחר —</option>
              ${METHODS.map(m => `<option value="${m.k}" ${t.primaryMethod===m.k?'selected':''}>${m.l}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="font-weight:700;color:#1B3A6B">📋 תוכנית ליווי</label>
            <textarea id="tp-plan" rows="4" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;margin-top:.25rem">${esc(t.plan||'')}</textarea>
          </div>

          <div style="display:flex;gap:.5rem;justify-content:flex-end;border-top:1px solid #e5e7eb;padding-top:.75rem">
            <button onclick="ClinicalSuite.ClientEnrichment.savePlan('${clientId}')" style="padding:.6rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">💾 שמור תוכנית</button>
          </div>
        </div>
      `;
      getModal()('🎯 תוכנית ליווי — ' + esc(c.name||''), html, { size:'lg' });
    },

    addGoal(clientId) {
      const c = State.clients.find(x => x.id === clientId);
      c.treatment = c.treatment || { goals:[], plan:'', primaryMethod:'' };
      c.treatment.goals.push({ text:'', status:'active', createdAt: todayISO() });
      this.openTreatmentPlan(clientId);
    },

    removeGoal(clientId, idx) {
      const c = State.clients.find(x => x.id === clientId);
      if (!c.treatment) return;
      c.treatment.goals.splice(idx, 1);
      this.openTreatmentPlan(clientId);
    },

    savePlan(clientId) {
      const c = State.clients.find(x => x.id === clientId);
      c.treatment = c.treatment || {};
      // Collect goals
      const goals = [];
      $$('input[data-goal-text]').forEach((el,i) => {
        const status = $(`select[data-goal-status="${el.dataset.goalText}"]`)?.value || 'active';
        if (el.value.trim()) goals.push({ text: el.value.trim(), status, createdAt: c.treatment.goals?.[i]?.createdAt || todayISO() });
      });
      c.treatment.goals = goals;
      c.treatment.primaryMethod = $('#tp-method').value;
      c.treatment.plan = $('#tp-plan').value.trim();
      c.treatment.updatedAt = new Date().toISOString();
      save(LS.clients, State.clients);
      showToast('תוכנית ליווי נשמרה ✓');
      closeModalSafe();
    },

    renderTimeline(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return '';
      const events = [];
      // Client created
      if (c.createdAt) events.push({ date: c.createdAt, type:'create', label:'הצטרף ללקוחות', icon:'👤' });
      // Sessions
      (State.sessions||[]).filter(s => s.clientId === clientId).forEach(s => {
        events.push({
          date: s.date + 'T' + (s.time||'12:00'),
          type:'session',
          label: `פגישה ${s.status==='completed'?'הסתיימה ✓':s.status==='no-show'?'Did not show':s.status==='cancelled'?'בוטלה':'מתוכננת'}`,
          icon: s.status==='completed'?'✅':s.status==='cancelled'?'❌':s.status==='no-show'?'⚠️':'📅',
          sub: s.notesData?.savedAt ? '📔 יש רשומה' : ''
        });
      });
      events.sort((a,b) => (b.date||'').localeCompare(a.date||''));
      return `<div style="position:relative;padding-right:1.5rem">
        <div style="position:absolute;top:0;bottom:0;right:.5rem;width:2px;background:#e5e7eb"></div>
        ${events.map(e => `
          <div style="position:relative;padding-bottom:1rem">
            <div style="position:absolute;right:-1.5rem;top:0;width:1.5rem;height:1.5rem;background:#fff;border:2px solid #1B3A6B;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.85rem">${e.icon}</div>
            <div style="padding-right:.5rem">
              <div style="font-weight:600;color:#1f2937">${esc(e.label)}</div>
              <div style="font-size:.8rem;color:#6b7280">${fmt(e.date)} ${e.sub?'· '+esc(e.sub):''}</div>
            </div>
          </div>
        `).join('')}
      </div>`;
    }
  };

  // =====================================================
  // PUBLIC INTERFACE
  // =====================================================
  window.ClinicalSuite = {
    SessionNotes,
    CalendarView,
    Financial,
    ClientEnrichment,
    METHODS,
    RISK_FLAGS,

    // Convenience: inject buttons into existing UI
    injectIntoSessionsView() {
      // Add Calendar toggle if not exists
      const sessRoot = document.getElementById('section-sessions') || document.getElementById('sessions-content');
      if (!sessRoot) return;
      if (sessRoot.querySelector('[data-clinical-cal-btn]')) return;
      const btn = document.createElement('button');
      btn.setAttribute('data-clinical-cal-btn','');
      btn.innerHTML = '🗓️ תצוגת קלנדר';
      btn.style.cssText = 'padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600;margin:.5rem';
      btn.onclick = () => this.openCalendarModal();
      sessRoot.prepend(btn);
    },

    openCalendarModal() {
      getModal()('🗓️ לוח פגישות', '<div id="clinical-calendar-root">טוען...</div>', { size:'xl' });
      setTimeout(() => CalendarView.render('clinical-calendar-root'), 100);
    },

    openFinancialModal() {
      getModal()('💵 דשבורד פיננסי', '<div id="clinical-fin-root">טוען...</div>', { size:'xl' });
      setTimeout(() => Financial.render('clinical-fin-root'), 100);
    },

    init() {
      // Make functions globally accessible for inline handlers
      window.openSessionNotes = (id) => SessionNotes.open(id);
      window.openTreatmentPlan = (id) => ClientEnrichment.openTreatmentPlan(id);
      window.openClinicalCalendar = () => this.openCalendarModal();
      window.openFinancialDashboard = () => this.openFinancialModal();
      console.log('[ClinicalSuite] ✓ Loaded — 4 modules ready');
    }
  };

  window.ClinicalSuite.init();
  } // end start()
})();
