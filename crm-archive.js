/* =====================================================
   crm-archive.js — Archive & Search
   קליניקת ארגמן · תיעוד ומחקר
   ─────────────────────────────────────────────────────
   Modules:
   1. BulkPDF       — full client record as printable PDF
   2. FullTextSearch — search across all SOAP notes,
                       session text, goals, treatment plans
   ===================================================== */
(function(){
  'use strict';

  function waitForState(a) {
    if (typeof State !== 'undefined') return start();
    if (a > 60) return console.warn('[CRMArchive] State not found');
    setTimeout(() => waitForState(a+1), 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => waitForState(0));
  else waitForState(0);

  function start(){

  const $ = (s,r) => (r||document).querySelector(s);
  const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
  const esc = s => String(s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const ils = n => '₪' + Math.round(Number(n||0)).toLocaleString('he-IL');
  const fmt = d => { try { return new Date(d).toLocaleDateString('he-IL'); } catch { return d; } };
  const fmtDt = d => { try { return new Date(d).toLocaleString('he-IL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return d; } };

  function getModal() {
    if (typeof openModal === 'function') return openModal;
    if (typeof modal === 'function') return (t,c,o) => modal(c, Object.assign({ title:t, size:'lg' }, o||{}));
    return (t) => alert(t);
  }
  function showToast(m, t) { if (typeof toast === 'function') return toast(m, t||'success'); console.log('[Archive]', m); }

  // =====================================================
  // MODULE 1: BULK PDF EXPORT (Full Client Record)
  // =====================================================
  const BulkPDF = {
    export(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return showToast('לקוח לא נמצא','error');

      const sessions = (State.sessions||[]).filter(s => s.clientId === clientId).sort((a,b) => (a.date||'').localeCompare(b.date||''));
      const completed = sessions.filter(s => s.status === 'completed');
      const paid = completed.filter(s => s.paid);
      const totalPaid = paid.reduce((sum,s) => sum + Number(s.price||0), 0);
      const outstanding = completed.filter(s => !s.paid && s.price).reduce((sum,s) => sum + Number(s.price||0), 0);

      const outcomes = JSON.parse(localStorage.getItem('argaman_outcomes')||'[]').filter(o => o.clientId === clientId).sort((a,b) => a.date.localeCompare(b.date));
      const risk = JSON.parse(localStorage.getItem('argaman_risk_assessments')||'[]').filter(r => r.clientId === clientId).sort((a,b) => b.date.localeCompare(a.date));
      const goals = c.treatment?.goals || [];

      const startDate = c.createdAt || c.startDate;
      const months = startDate ? Math.max(1, Math.round((new Date() - new Date(startDate)) / (1000*60*60*24*30))) : 0;

      // Build HTML
      const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>תיק לקוח — ${esc(c.name||'')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Heebo',Arial,sans-serif;color:#1f2937;line-height:1.6;padding:20mm 15mm;background:#fff;font-size:11pt}
  .header{border-bottom:3px solid #1B3A6B;padding-bottom:.75rem;margin-bottom:1.5rem}
  .header h1{color:#1B3A6B;font-size:1.8rem;margin-bottom:.25rem}
  .header .sub{color:#6b7280;font-size:.9rem}
  h2{color:#1B3A6B;font-size:1.2rem;margin:1.5rem 0 .5rem;border-bottom:1px solid #C9A84C;padding-bottom:.25rem}
  h3{color:#1B3A6B;font-size:1rem;margin:1rem 0 .4rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.75rem;margin:.5rem 0}
  .kpi{background:#f9fafb;padding:.5rem;border-radius:6px;text-align:center;border:1px solid #e5e7eb}
  .kpi-label{font-size:.7rem;color:#6b7280}
  .kpi-value{font-size:1.3rem;font-weight:800;color:#1B3A6B}
  .info-row{display:flex;justify-content:space-between;padding:.3rem 0;border-bottom:1px dashed #e5e7eb}
  .info-row strong{color:#6b7280;font-weight:600}
  .session{border:1px solid #e5e7eb;padding:.6rem;margin-bottom:.5rem;border-radius:6px;page-break-inside:avoid}
  .session-head{display:flex;justify-content:space-between;padding-bottom:.25rem;border-bottom:1px solid #f3f4f6;margin-bottom:.3rem}
  .session-head strong{color:#1B3A6B}
  .soap{background:#f9fafb;padding:.5rem;border-radius:4px;margin-top:.4rem;font-size:.9rem}
  .soap-field{margin-bottom:.4rem}
  .soap-field strong{color:#1B3A6B;display:inline-block;min-width:18px}
  .risks{color:#dc2626;font-weight:700;background:#fee2e2;padding:.3rem .5rem;border-radius:4px;display:inline-block;margin-top:.3rem;font-size:.85rem}
  .methods{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.3rem}
  .methods span{background:#1B3A6B;color:#fff;padding:.1rem .4rem;border-radius:50px;font-size:.7rem}
  table{width:100%;border-collapse:collapse;font-size:.85rem;margin:.5rem 0}
  th{background:#1B3A6B;color:#fff;padding:.4rem;text-align:right}
  td{padding:.35rem;border-bottom:1px solid #f3f4f6}
  .goal{background:#f9fafb;border-right:3px solid #1B3A6B;padding:.5rem;margin-bottom:.3rem;border-radius:0 4px 4px 0}
  .progress-bar{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-top:.25rem}
  .progress-fill{height:100%;background:#1B3A6B}
  .footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e5e7eb;color:#6b7280;font-size:.8rem;text-align:center}
  .badge{display:inline-block;padding:.1rem .4rem;border-radius:50px;font-size:.75rem;font-weight:600}
  .badge-paid{background:#dcfce7;color:#16a34a}
  .badge-unpaid{background:#fee2e2;color:#dc2626}
  .badge-completed{background:#dbeafe;color:#1B3A6B}
  .badge-cancelled{background:#f3f4f6;color:#6b7280}
  .badge-noshow{background:#fee2e2;color:#dc2626}
  .empty{color:#9ca3af;font-style:italic;padding:.3rem 0}
  .confidential{background:#fef3c7;border-right:3px solid #f59e0b;padding:.5rem;border-radius:0 6px 6px 0;font-size:.85rem;margin:1rem 0;color:#854d0e}
  @media print{
    body{padding:10mm}
    h2{page-break-after:avoid}
    .session{page-break-inside:avoid}
  }
</style>
</head><body>

<div class="header">
  <h1>תיק לקוח — ${esc(c.name||'')}</h1>
  <div class="sub">קליניקת ארגמן · גל ממן · נוצר: ${fmtDt(new Date())}</div>
</div>

<div class="confidential">
  🔒 <strong>מסמך חסוי לשימוש מקצועי בלבד.</strong> כפוף לחיסיון מקצועי ולחוק הגנת הפרטיות התשע״ז-2017.
</div>

<h2>👤 פרטי לקוח</h2>
<div class="info-row"><strong>שם מלא</strong><span>${esc(c.name||'—')}</span></div>
<div class="info-row"><strong>טלפון</strong><span>${esc(c.phone||'—')}</span></div>
${c.email ? `<div class="info-row"><strong>אימייל</strong><span>${esc(c.email)}</span></div>` : ''}
<div class="info-row"><strong>סוג שירות</strong><span>${esc(c.type||'—')}</span></div>
<div class="info-row"><strong>סטטוס</strong><span>${esc(c.status||'—')}</span></div>
<div class="info-row"><strong>תאריך התחלה</strong><span>${startDate?fmt(startDate):'—'}</span></div>
<div class="info-row"><strong>משך בקליניקה</strong><span>${months} חודשים</span></div>

<div class="grid">
  <div class="kpi"><div class="kpi-label">פגישות הושלמו</div><div class="kpi-value">${completed.length}</div></div>
  <div class="kpi"><div class="kpi-label">סך הכל</div><div class="kpi-value">${sessions.length}</div></div>
  <div class="kpi"><div class="kpi-label">שולם</div><div class="kpi-value">${ils(totalPaid)}</div></div>
  ${outstanding>0 ? `<div class="kpi" style="background:#fee2e2"><div class="kpi-label">חוב פתוח</div><div class="kpi-value" style="color:#dc2626">${ils(outstanding)}</div></div>` : ''}
</div>

${c.treatment ? `
<h2>🎯 תוכנית טיפול</h2>
${c.treatment.primaryMethod ? `<p><strong>שיטה ראשית:</strong> ${esc(c.treatment.primaryMethod)}</p>` : ''}
${c.treatment.plan ? `<p style="margin:.5rem 0;background:#f9fafb;padding:.5rem;border-radius:4px;white-space:pre-wrap">${esc(c.treatment.plan)}</p>` : ''}
${goals.length ? `
  <h3>יעדים (${goals.length})</h3>
  ${goals.map((g,i) => `
    <div class="goal">
      <strong>${i+1}.</strong> ${esc(g.text||'')}
      <span class="badge ${g.status==='achieved'?'badge-paid':'badge-completed'}">${g.status==='achieved'?'✓ הושג':g.status==='progress'?'בהתקדמות':'פעיל'}</span>
      ${g.progress !== undefined ? `<div class="progress-bar"><div class="progress-fill" style="width:${g.progress||0}%"></div></div><div style="font-size:.75rem;color:#6b7280;margin-top:.15rem">${g.progress||0}%</div>` : ''}
    </div>
  `).join('')}
` : ''}
` : ''}

${risk.length ? `
<h2>🚨 הערכות סיכון</h2>
<table>
  <thead><tr><th>תאריך</th><th>כלי</th><th>ציון</th><th>רמה</th></tr></thead>
  <tbody>
    ${risk.map(r => `<tr><td>${fmtDt(r.date)}</td><td><strong>${esc(r.type||'')}</strong></td><td>${r.score?.total ?? '—'}</td><td style="color:${r.score?.color||'#6b7280'};font-weight:700">${esc(r.score?.level||'—')}</td></tr>`).join('')}
  </tbody>
</table>
` : ''}

${outcomes.length ? `
<h2>📊 מדדי Outcome</h2>
<table>
  <thead><tr><th>תאריך</th><th>כלי</th><th>ציון</th><th>פירוש</th></tr></thead>
  <tbody>
    ${outcomes.map(o => `<tr><td>${fmt(o.date)}</td><td><strong>${esc(o.type||'')}</strong></td><td>${o.total}${o.max?'/'+o.max:''}</td><td style="color:${o.color||'#6b7280'}">${esc(o.band||'—')}</td></tr>`).join('')}
  </tbody>
</table>
${outcomes.length >= 2 ? this._svgChart(outcomes) : ''}
` : ''}

<h2>📅 היסטוריית פגישות (${sessions.length})</h2>
${sessions.length ? sessions.map(s => {
  const n = s.notesData || {};
  return `<div class="session">
    <div class="session-head">
      <strong>${fmt(s.date)} ${s.time||''}</strong>
      <span>
        <span class="badge badge-${s.status||'completed'}">${({scheduled:'מתוכננת',completed:'הושלמה',cancelled:'בוטלה','no-show':'לא הגיע'})[s.status]||s.status||'—'}</span>
        ${s.price ? `<span class="badge ${s.paid?'badge-paid':'badge-unpaid'}">${s.paid?'✓ ':''}${ils(s.price)}</span>` : ''}
      </span>
    </div>
    ${s.notes ? `<div style="font-size:.85rem;color:#6b7280;margin:.2rem 0">${esc(s.notes)}</div>` : ''}
    ${(n.s || n.o || n.a || n.p) ? `<div class="soap">
      ${n.s ? `<div class="soap-field"><strong>S:</strong> ${esc(n.s).replace(/\n/g,'<br>')}</div>` : ''}
      ${n.o ? `<div class="soap-field"><strong>O:</strong> ${esc(n.o).replace(/\n/g,'<br>')}</div>` : ''}
      ${n.a ? `<div class="soap-field"><strong>A:</strong> ${esc(n.a).replace(/\n/g,'<br>')}</div>` : ''}
      ${n.p ? `<div class="soap-field"><strong>P:</strong> ${esc(n.p).replace(/\n/g,'<br>')}</div>` : ''}
      ${n.homework ? `<div class="soap-field"><strong>שיעורי בית:</strong> ${esc(n.homework).replace(/\n/g,'<br>')}</div>` : ''}
      ${n.nextFocus ? `<div class="soap-field"><strong>הפעם הבאה:</strong> ${esc(n.nextFocus).replace(/\n/g,'<br>')}</div>` : ''}
      ${n.methods && n.methods.length ? `<div class="methods">${n.methods.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
      ${n.risks && n.risks.length ? `<div class="risks">🚨 דגלים: ${n.risks.map(esc).join(' · ')}</div>` : ''}
    </div>` : ''}
  </div>`;
}).join('') : '<p class="empty">אין פגישות מתועדות</p>'}

<div class="footer">
  קליניקת ארגמן · גל ממן · בית שמש · argamanclinic.com<br>
  מסמך זה מכיל מידע רפואי/פסיכולוגי חסוי. שמירה ושימוש כפופים לחוק.
</div>

<script>setTimeout(() => window.print(), 500)</script>
</body></html>`;

      const w = window.open('','_blank','width=900,height=1000');
      w.document.write(html);
      w.document.close();
      if (window.CRMPlus?.Security?.log) window.CRMPlus.Security.log('client_pdf_exported', { clientId });
      showToast('PDF נפתח — לחץ "שמור כ-PDF" בדו-שיח ההדפסה');
    },

    _svgChart(outcomes) {
      // Group by type
      const byType = {};
      outcomes.forEach(o => { (byType[o.type] = byType[o.type]||[]).push(o); });
      let svg = '';
      Object.entries(byType).forEach(([type, list]) => {
        if (list.length < 2) return;
        const w = 600, h = 120, pad = 30;
        const max = Math.max(...list.map(o => o.total), 1);
        const dx = (w-pad*2) / (list.length-1);
        const y = v => h-pad - (v/max)*(h-pad*2);
        const points = list.map((o,i) => `${pad+i*dx},${y(o.total)}`).join(' ');
        svg += `<div style="margin:1rem 0"><strong style="color:#1B3A6B">${esc(type)}</strong>
          <svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:600px;height:auto;background:#fafafa;border-radius:4px">
            <polyline points="${points}" fill="none" stroke="#1B3A6B" stroke-width="2"/>
            ${list.map((o,i) => `<circle cx="${pad+i*dx}" cy="${y(o.total)}" r="3" fill="${o.color||'#1B3A6B'}"/><text x="${pad+i*dx}" y="${y(o.total)-8}" text-anchor="middle" font-size="10" fill="#1B3A6B" font-weight="700">${o.total}</text><text x="${pad+i*dx}" y="${h-8}" text-anchor="middle" font-size="9" fill="#6b7280">${esc(fmt(o.date))}</text>`).join('')}
          </svg></div>`;
      });
      return svg;
    }
  };

  // =====================================================
  // MODULE 2: FULL-TEXT SEARCH
  // =====================================================
  const FullSearch = {
    open() {
      const html = `
        <p>חיפוש חופשי בכל רשומות הפגישות, היעדים, התוכניות והערות.</p>
        <div style="margin:1rem 0">
          <input type="text" id="fts-query" placeholder="חיפוש... (לפחות 2 תווים)" autofocus style="width:100%;padding:.75rem 1rem;border:2px solid #e5e7eb;border-radius:10px;font-size:1rem;font-family:inherit" oninput="window.CRMArchive.FullSearch._debounceSearch()">
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem">
            <label style="font-size:.85rem"><input type="checkbox" id="fts-soap" checked> רשומות SOAP</label>
            <label style="font-size:.85rem"><input type="checkbox" id="fts-notes" checked> הערות פגישה</label>
            <label style="font-size:.85rem"><input type="checkbox" id="fts-goals" checked> יעדים</label>
            <label style="font-size:.85rem"><input type="checkbox" id="fts-plan" checked> תוכניות טיפול</label>
            <label style="font-size:.85rem"><input type="checkbox" id="fts-client" checked> פרטי לקוח</label>
          </div>
        </div>
        <div id="fts-results">
          <p style="color:#6b7280;text-align:center;padding:2rem">הקלד מילה לחיפוש</p>
        </div>
      `;
      getModal()('🔍 חיפוש בכל הרשומות', html, { size:'xl' });
      setTimeout(() => $('#fts-query')?.focus(), 200);
    },

    _debounceSearch() {
      clearTimeout(this._t);
      this._t = setTimeout(() => this._search(), 300);
    },

    _search() {
      const q = $('#fts-query')?.value.trim().toLowerCase();
      if (!q || q.length < 2) {
        $('#fts-results').innerHTML = '<p style="color:#6b7280;text-align:center;padding:2rem">הקלד לפחות 2 תווים</p>';
        return;
      }
      const opts = {
        soap: $('#fts-soap')?.checked,
        notes: $('#fts-notes')?.checked,
        goals: $('#fts-goals')?.checked,
        plan: $('#fts-plan')?.checked,
        client: $('#fts-client')?.checked
      };

      const results = [];
      const clients = State.clients || [];
      const sessions = State.sessions || [];

      // Search sessions (SOAP + notes)
      sessions.forEach(s => {
        const client = clients.find(c => c.id === s.clientId);
        const clientName = client?.name || '(לא ידוע)';
        if (opts.notes && s.notes && s.notes.toLowerCase().includes(q)) {
          results.push({
            type: 'session-note',
            icon: '📝',
            clientId: s.clientId,
            clientName,
            date: s.date,
            sessionId: s.id,
            field: 'הערת פגישה',
            snippet: this._highlight(s.notes, q)
          });
        }
        if (opts.soap && s.notesData) {
          ['s','o','a','p','homework','nextFocus'].forEach(k => {
            const text = s.notesData[k];
            if (text && text.toLowerCase().includes(q)) {
              const labels = { s:'S - Subjective', o:'O - Objective', a:'A - Assessment', p:'P - Plan', homework:'שיעורי בית', nextFocus:'הפעם הבאה' };
              results.push({
                type: 'soap',
                icon: '📔',
                clientId: s.clientId,
                clientName,
                date: s.date,
                sessionId: s.id,
                field: labels[k],
                snippet: this._highlight(text, q)
              });
            }
          });
        }
      });

      // Search clients (plan, goals, client info)
      clients.forEach(c => {
        if (opts.client) {
          ['name','phone','email','notes'].forEach(k => {
            const v = c[k];
            if (v && String(v).toLowerCase().includes(q)) {
              results.push({
                type: 'client',
                icon: '👤',
                clientId: c.id,
                clientName: c.name,
                field: { name:'שם', phone:'טלפון', email:'אימייל', notes:'הערות' }[k] || k,
                snippet: this._highlight(String(v), q)
              });
            }
          });
        }
        if (c.treatment) {
          if (opts.plan && c.treatment.plan && c.treatment.plan.toLowerCase().includes(q)) {
            results.push({
              type: 'plan',
              icon: '🎯',
              clientId: c.id,
              clientName: c.name,
              field: 'תוכנית טיפול',
              snippet: this._highlight(c.treatment.plan, q)
            });
          }
          if (opts.goals && c.treatment.goals) {
            c.treatment.goals.forEach((g, idx) => {
              if (g.text && g.text.toLowerCase().includes(q)) {
                results.push({
                  type: 'goal',
                  icon: '🎯',
                  clientId: c.id,
                  clientName: c.name,
                  field: `יעד #${idx+1}`,
                  snippet: this._highlight(g.text, q)
                });
              }
            });
          }
        }
      });

      this._renderResults(results, q);
    },

    _highlight(text, query) {
      const t = String(text);
      const idx = t.toLowerCase().indexOf(query.toLowerCase());
      if (idx < 0) return esc(t.slice(0, 150)) + (t.length>150?'...':'');
      const start = Math.max(0, idx - 40);
      const end = Math.min(t.length, idx + query.length + 80);
      const before = t.slice(start, idx);
      const match = t.slice(idx, idx + query.length);
      const after = t.slice(idx + query.length, end);
      return (start>0?'...':'') + esc(before) + `<mark style="background:#fef3c7;color:#854d0e;padding:.1rem .2rem;border-radius:3px;font-weight:700">${esc(match)}</mark>` + esc(after) + (end<t.length?'...':'');
    },

    _renderResults(results, query) {
      const root = $('#fts-results');
      if (!results.length) {
        root.innerHTML = `<p style="color:#6b7280;text-align:center;padding:2rem">לא נמצאו תוצאות עבור "<strong>${esc(query)}</strong>"</p>`;
        return;
      }
      // Group by client
      const byClient = {};
      results.forEach(r => {
        (byClient[r.clientId] = byClient[r.clientId] || []).push(r);
      });
      root.innerHTML = `
        <p style="color:#6b7280;margin-bottom:1rem;font-size:.9rem">נמצאו <strong style="color:#1B3A6B">${results.length}</strong> תוצאות עבור "<strong>${esc(query)}</strong>" ב-${Object.keys(byClient).length} לקוחות</p>
        ${Object.entries(byClient).map(([cid, items]) => {
          const cname = items[0].clientName;
          return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:.75rem;margin-bottom:.5rem">
            <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:.4rem;border-bottom:1px solid #f3f4f6">
              <strong style="color:#1B3A6B;font-size:1.05rem">👤 ${esc(cname)}</strong>
              <span style="background:#1B3A6B;color:#fff;padding:.15rem .5rem;border-radius:50px;font-size:.75rem">${items.length}</span>
            </div>
            ${items.slice(0,8).map(r => `
              <div style="padding:.5rem;border-bottom:1px solid #f9fafb;font-size:.9rem">
                <div style="display:flex;justify-content:space-between;margin-bottom:.2rem">
                  <strong style="color:#6b7280;font-size:.8rem">${r.icon} ${esc(r.field)}</strong>
                  ${r.date ? `<span style="color:#9ca3af;font-size:.75rem">${fmt(r.date)}</span>` : ''}
                </div>
                <div style="color:#1f2937;line-height:1.5">${r.snippet}</div>
                ${r.clientId ? `<button onclick="viewClient('${r.clientId}');window.CRMArchive.FullSearch._closeM()" style="margin-top:.3rem;background:#eff4ff;color:#1B3A6B;border:0;padding:.2rem .6rem;border-radius:50px;cursor:pointer;font-size:.75rem;font-weight:600">פתח לקוח →</button>` : ''}
              </div>
            `).join('')}
            ${items.length > 8 ? `<div style="text-align:center;color:#6b7280;font-size:.8rem;padding:.3rem">+ ${items.length-8} תוצאות נוספות</div>` : ''}
          </div>`;
        }).join('')}
      `;
    },

    _closeM() {
      if (typeof closeModal === 'function') return closeModal();
      document.querySelectorAll('.modal-bg').forEach(m => m.remove());
    }
  };

  // =====================================================
  // PUBLIC INTERFACE
  // =====================================================
  window.CRMArchive = {
    BulkPDF, FullSearch,
    init() {
      window.openBulkPDF = (id) => BulkPDF.export(id);
      window.openFullSearch = () => FullSearch.open();
      console.log('[CRMArchive] ✓ 2 modules loaded');
    }
  };
  window.CRMArchive.init();

  } // end start
})();
