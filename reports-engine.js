/* =====================================================
   reports-engine.js — Business Intelligence Suite
   קליניקת ארגמן · מערכת דוחות חכמה
   ─────────────────────────────────────────────────────
   15 דוחות אוטומטיים + תובנות + ייצוא
   ─────────────────────────────────────────────────────
   קטגוריות:
   1. Executive Dashboard
   2. Clients (5 reports)
   3. Financial (3 reports)
   4. Growth & Marketing (3 reports)
   5. Productivity (2 reports)
   6. Clinical Outcomes (1 report)
   7. SEO & Content (1 report)
   8. Growth Diagnostics + AI Recommendations (1 report)
   ===================================================== */
(function(){
  'use strict';
  if (typeof State === 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }
  init();

  function init() {
    if (typeof State === 'undefined') { setTimeout(init, 200); return; }
    start();
  }

  function start() {

  // ─── Helpers ───
  const $ = (s,r) => (r||document).querySelector(s);
  const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
  const esc = s => String(s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const ils = n => '₪' + Math.round(Number(n||0)).toLocaleString('he-IL');
  const pct = n => Math.round(n*100) + '%';
  const fmt = d => { const x = new Date(d); return isNaN(x)?'—':x.toLocaleDateString('he-IL'); };
  const fmtMonth = d => { const x = new Date(d); return isNaN(x)?'—':x.toLocaleDateString('he-IL',{month:'short',year:'2-digit'}); };
  const monthKey = d => { const x = new Date(d); return x.toISOString().slice(0,7); };
  const today = () => new Date();
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate()-n); return d; };
  const daysBetween = (a,b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

  function getModal() {
    // Prefer openModal(title, content, opts) — correct signature
    if (typeof openModal === 'function') return openModal;
    if (typeof modal === 'function') return (title, content, opts) => modal(content, Object.assign({ title, size:'lg' }, opts||{}));
    return (t,h,opts) => alert(t + '\n' + (h||'').replace(/<[^>]+>/g,' ').slice(0,500));
  }
  function closeModalSafe() {
    if (typeof window.closeModal === 'function') return window.closeModal();
    document.querySelectorAll('.modal-bg, .modal-backdrop, .modal-overlay').forEach(m => m.remove());
  }

  // SVG chart helpers
  function lineChart(data, opts={}) {
    if (!data.length) return '<p style="color:#6b7280;text-align:center;padding:1rem">אין נתונים</p>';
    const w = opts.width || 520, h = opts.height || 160, pad = 35;
    const vals = data.map(d => d.value);
    const max = Math.max(...vals, opts.minMax||1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    const dx = data.length > 1 ? (w - pad*2) / (data.length-1) : 0;
    const y = v => h - pad - ((v-min)/range)*(h-pad*2);
    const points = data.map((d,i) => `${pad + i*dx},${y(d.value)}`).join(' ');
    const color = opts.color || '#1B3A6B';
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;background:#fafafa;border-radius:8px">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5"/>
      <polyline points="${pad},${h-pad} ${points} ${pad + (data.length-1)*dx},${h-pad}" fill="${color}" fill-opacity="0.1" stroke="none"/>
      ${data.map((d,i) => `<circle cx="${pad + i*dx}" cy="${y(d.value)}" r="4" fill="${color}"/>
        <text x="${pad + i*dx}" y="${y(d.value)-10}" text-anchor="middle" font-size="10" fill="${color}" font-weight="700">${opts.fmt?opts.fmt(d.value):d.value}</text>
        <text x="${pad + i*dx}" y="${h-8}" text-anchor="middle" font-size="10" fill="#6b7280">${esc(d.label)}</text>`).join('')}
    </svg>`;
  }
  function barChart(data, opts={}) {
    if (!data.length) return '<p style="color:#6b7280;text-align:center;padding:1rem">אין נתונים</p>';
    const max = Math.max(...data.map(d => d.value), 1);
    return `<div style="display:flex;flex-direction:column;gap:.4rem">${data.map(d => `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:.15rem">
          <span>${esc(d.label)}</span>
          <strong style="color:${d.color||'#1B3A6B'}">${opts.fmt?opts.fmt(d.value):d.value}</strong>
        </div>
        <div style="height:18px;background:#f3f4f6;border-radius:6px;overflow:hidden">
          <div style="height:100%;background:${d.color||'#1B3A6B'};width:${d.value/max*100}%;transition:width .5s"></div>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function downloadCSV(name, rows) {
    const csv = rows.map(r => r.map(x => `"${String(x||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  }

  function printReport(title, html) {
    const w = window.open('','_blank','width=900,height=1000');
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>${esc(title)}</title><style>
      body{font-family:Heebo,Arial,sans-serif;max-width:800px;margin:1rem auto;padding:0 1.5rem;line-height:1.6;color:#1f2937}
      h1{color:#1B3A6B;border-bottom:3px solid #C9A84C;padding-bottom:.5rem}
      h2{color:#1B3A6B;margin-top:2rem;border-bottom:1px solid #e5e7eb;padding-bottom:.25rem}
      h3{color:#1B3A6B;margin-top:1.5rem}
      table{width:100%;border-collapse:collapse;font-size:.9rem;margin:.75rem 0}
      th{background:#1B3A6B;color:#fff;padding:.5rem;text-align:right}
      td{padding:.4rem;border-bottom:1px solid #e5e7eb}
      .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin:1rem 0}
      .kpi{background:#f9fafb;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px}
      .kpi-label{font-size:.75rem;color:#6b7280}
      .kpi-value{font-size:1.5rem;font-weight:800;color:#1B3A6B}
      .insight{background:#fef3c7;border-right:4px solid #f59e0b;padding:.75rem;border-radius:8px;margin:.75rem 0}
      .insight strong{color:#854d0e}
      footer{text-align:center;margin-top:3rem;padding-top:1rem;border-top:1px solid #e5e7eb;color:#6b7280;font-size:.8rem}
      @media print{body{margin:0;padding:1rem;font-size:11pt}.no-print{display:none}}
    </style></head><body>
      <h1>${esc(title)}</h1>
      <p style="color:#6b7280">קליניקת ארגמן · גל ממן · נוצר: ${new Date().toLocaleString('he-IL')}</p>
      ${html}
      <footer>קליניקת ארגמן · בית שמש · argamanclinic.com</footer>
      <script>setTimeout(()=>window.print(),300)</`+`script>
    </body></html>`);
    w.document.close();
  }

  // =====================================================
  // EXECUTIVE DASHBOARD
  // =====================================================
  const Executive = {
    render(root) {
      const c = State.clients || [];
      const s = State.sessions || [];
      const leads = State.leads || [];
      const now = today();
      const thisMonth = monthKey(now);
      const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth()-1, 1));

      const activeClients = c.filter(x => x.status === 'active').length;
      const newClientsThisMonth = c.filter(x => monthKey(x.createdAt||x.startDate||0) === thisMonth).length;
      const newLeadsThisMonth = leads.filter(l => monthKey(l.createdAt||0) === thisMonth).length;
      const sessThisMonth = s.filter(x => monthKey(x.date) === thisMonth);
      const sessLastMonth = s.filter(x => monthKey(x.date) === lastMonth);
      const revThisMonth = sessThisMonth.filter(x => x.paid).reduce((sum,x) => sum + (Number(x.price)||0), 0);
      const revLastMonth = sessLastMonth.filter(x => x.paid).reduce((sum,x) => sum + (Number(x.price)||0), 0);
      const growth = revLastMonth > 0 ? Math.round((revThisMonth - revLastMonth) / revLastMonth * 100) : 0;
      const outstandingTotal = s.filter(x => x.status==='completed' && !x.paid && x.price).reduce((sum,x) => sum + Number(x.price), 0);
      const upcomingWeek = s.filter(x => {
        const d = new Date(x.date);
        return x.status==='scheduled' && d >= now && d <= daysAgo(-7);
      }).length;
      const noShows = sessThisMonth.filter(x => x.status === 'no-show').length;
      const totalSessions = sessThisMonth.filter(x => x.status === 'completed').length;
      const noShowRate = totalSessions > 0 ? noShows / (totalSessions + noShows) : 0;

      // Insights
      const insights = [];
      if (growth > 10) insights.push({ type:'good', text:`🚀 צמיחה של ${growth}% מהחודש שעבר — המשך כך!` });
      if (growth < -10) insights.push({ type:'warn', text:`⚠️ ירידה של ${Math.abs(growth)}% מהחודש שעבר — לבדוק מה השתנה` });
      if (outstandingTotal > 3000) insights.push({ type:'warn', text:`💰 ${ils(outstandingTotal)} בחובות פתוחים — שווה לגבות` });
      if (noShowRate > 0.1) insights.push({ type:'warn', text:`⏰ אחוז Did-not-show: ${pct(noShowRate)} — שווה לחזק תזכורות 24h` });
      if (newLeadsThisMonth < 3) insights.push({ type:'warn', text:`📉 רק ${newLeadsThisMonth} לידים החודש — לבדוק שיווק` });
      if (upcomingWeek > 20) insights.push({ type:'good', text:`📅 ${upcomingWeek} פגישות השבוע הקרוב — שבוע עמוס!` });

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">📊 דשבורד מנהל — סיכום מבט-על</h2>
        <p style="color:#6b7280">תמונת מצב מהירה של ${new Date().toLocaleDateString('he-IL',{month:'long',year:'numeric'})}</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin:1rem 0">
          ${[
            {l:'הכנסות החודש',v:ils(revThisMonth),sub:growth>=0?`▲ ${growth}%`:`▼ ${Math.abs(growth)}%`,c:growth>=0?'#16a34a':'#dc2626'},
            {l:'לקוחות פעילים',v:activeClients,sub:`+${newClientsThisMonth} השנה`,c:'#1B3A6B'},
            {l:'לידים חודש',v:newLeadsThisMonth,sub:'נכנסים',c:'#3a8a99'},
            {l:'פגישות החודש',v:totalSessions,sub:`${noShows} no-show`,c:'#C9A84C'},
            {l:'חובות',v:ils(outstandingTotal),sub:'פתוחים',c:outstandingTotal>0?'#dc2626':'#16a34a'},
            {l:'השבוע הקרוב',v:upcomingWeek,sub:'פגישות',c:'#8B4C8C'}
          ].map(k => `
            <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px">
              <div style="font-size:.8rem;color:#6b7280">${k.l}</div>
              <div style="font-size:1.6rem;font-weight:800;color:${k.c};line-height:1.1">${k.v}</div>
              <div style="font-size:.75rem;color:${k.c}">${k.sub}</div>
            </div>
          `).join('')}
        </div>

        ${insights.length ? `<h3 style="color:#1B3A6B">💡 תובנות מיידיות</h3>
        <div style="display:flex;flex-direction:column;gap:.4rem">${insights.map(i => `
          <div style="background:${i.type==='good'?'#dcfce7':'#fef3c7'};border-right:4px solid ${i.type==='good'?'#16a34a':'#f59e0b'};padding:.75rem;border-radius:6px">${esc(i.text)}</div>
        `).join('')}</div>` : ''}

        <h3 style="color:#1B3A6B;margin-top:1.5rem">📈 הכנסות 6 חודשים אחרונים</h3>
        ${(() => {
          const data = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
            const m = monthKey(d);
            const rev = s.filter(x => monthKey(x.date)===m && x.paid).reduce((sum,x) => sum + Number(x.price||0), 0);
            data.push({ label: fmtMonth(d), value: rev });
          }
          return lineChart(data, { fmt: ils, color:'#1B3A6B' });
        })()}

        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem;flex-wrap:wrap">
          <button onclick="ReportsEngine.print('דשבורד מנהל','${''}','executive')" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">🖨️ הדפס</button>
        </div>
      `;
    }
  };

  // =====================================================
  // CLIENT REPORTS
  // =====================================================
  const ClientReports = {
    // 1. LTV Ranking
    ltv(root) {
      const sessions = State.sessions || [];
      const clients = State.clients || [];
      const ltv = clients.map(c => {
        const sess = sessions.filter(s => s.clientId === c.id);
        const paid = sess.filter(s => s.paid);
        const revenue = paid.reduce((sum,s) => sum + (Number(s.price)||0), 0);
        const avg = paid.length ? revenue/paid.length : 0;
        return { c, revenue, sessions: paid.length, totalSess: sess.length, avg };
      }).filter(x => x.revenue > 0).sort((a,b) => b.revenue - a.revenue);
      const total = ltv.reduce((s,x) => s+x.revenue, 0);
      const avg = ltv.length ? total/ltv.length : 0;
      const top20 = ltv.slice(0, Math.ceil(ltv.length*0.2));
      const top20Rev = top20.reduce((s,x) => s+x.revenue, 0);

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">💰 LTV — דירוג לקוחות לפי הכנסה</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin:1rem 0">
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">סה״כ הכנסות</div><div style="font-size:1.4rem;font-weight:800;color:#1B3A6B">${ils(total)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">לקוחות משלמים</div><div style="font-size:1.4rem;font-weight:800;color:#1B3A6B">${ltv.length}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">LTV ממוצע</div><div style="font-size:1.4rem;font-weight:800;color:#1B3A6B">${ils(avg)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">Pareto 80/20</div><div style="font-size:1.4rem;font-weight:800;color:#1B3A6B">${pct(total?top20Rev/total:0)}</div><div style="font-size:.7rem;color:#6b7280">מ-20% עליונים</div></div>
        </div>

        ${top20Rev / Math.max(total,1) > 0.7 ? '<div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:.75rem;border-radius:6px;margin:.75rem 0">💡 <strong>תובנה:</strong> 20% מהלקוחות מייצרים יותר מ-70% מההכנסות — חשוב לשמור עליהם!</div>' : ''}

        <table style="width:100%;font-size:.9rem;border-collapse:collapse;margin-top:1rem">
          <thead style="background:#1B3A6B;color:#fff"><tr><th style="padding:.5rem;text-align:right">#</th><th style="padding:.5rem;text-align:right">לקוח</th><th>פגישות</th><th>ממוצע</th><th>סה״כ</th></tr></thead>
          <tbody>${ltv.slice(0,25).map((x,i) => `
            <tr style="border-bottom:1px solid #f3f4f6;${i<5?'background:#fef9e7':''}">
              <td style="padding:.4rem">${i+1}${i<3?' 🏆':''}</td>
              <td style="padding:.4rem"><strong>${esc(x.c.name||'')}</strong></td>
              <td style="padding:.4rem;text-align:center">${x.sessions}/${x.totalSess}</td>
              <td style="padding:.4rem;text-align:center">${ils(x.avg)}</td>
              <td style="padding:.4rem;text-align:center"><strong>${ils(x.revenue)}</strong></td>
            </tr>
          `).join('')}</tbody>
        </table>
        <div style="margin-top:1rem"><button onclick="ReportsEngine.exportLTV()" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">📥 ייצוא מלא ל-CSV</button></div>
      `;
    },

    exportLTV() {
      const sessions = State.sessions || [];
      const rows = [['#','שם','טלפון','סוג','סטטוס','פגישות','הכנסות','ממוצע']];
      const data = (State.clients||[]).map(c => {
        const sess = sessions.filter(s => s.clientId === c.id);
        const paid = sess.filter(s => s.paid);
        const revenue = paid.reduce((sum,s) => sum + (Number(s.price)||0), 0);
        return { c, revenue, count: paid.length };
      }).sort((a,b) => b.revenue - a.revenue);
      data.forEach((x,i) => rows.push([i+1, x.c.name, x.c.phone, x.c.type, x.c.status, x.count, x.revenue, x.count?Math.round(x.revenue/x.count):0]));
      downloadCSV('ltv_ranking', rows);
    },

    // 2. Inactive Clients (re-engagement opportunity)
    inactive(root) {
      const sessions = State.sessions || [];
      const clients = State.clients || [];
      const now = today();
      const analyzed = clients.map(c => {
        const sess = sessions.filter(s => s.clientId === c.id && s.status==='completed').sort((a,b) => b.date.localeCompare(a.date));
        const lastSess = sess[0];
        const days = lastSess ? daysBetween(lastSess.date, now) : (c.createdAt ? daysBetween(c.createdAt, now) : 9999);
        return { c, lastSess, days, sessCount: sess.length };
      }).filter(x => x.c.status !== 'completed' && x.c.status !== 'archived').sort((a,b) => b.days - a.days);

      const buckets = {
        '90+': analyzed.filter(x => x.days >= 90),
        '60-90': analyzed.filter(x => x.days >= 60 && x.days < 90),
        '30-60': analyzed.filter(x => x.days >= 30 && x.days < 60),
        '<30': analyzed.filter(x => x.days < 30)
      };

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">⏰ לקוחות לא פעילים — הזדמנות לחידוש קשר</h2>
        <p style="color:#6b7280">פילוח לקוחות לפי הזמן שעבר מאז הפגישה האחרונה</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin:1rem 0">
          <div style="background:#fee2e2;border:1px solid #dc2626;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#991b1b">90+ ימים</div><div style="font-size:1.6rem;font-weight:800;color:#dc2626">${buckets['90+'].length}</div><div style="font-size:.7rem;color:#991b1b">🚨 דחוף</div></div>
          <div style="background:#fef3c7;border:1px solid #f59e0b;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#854d0e">60-90 ימים</div><div style="font-size:1.6rem;font-weight:800;color:#f59e0b">${buckets['60-90'].length}</div><div style="font-size:.7rem;color:#854d0e">⚠️ שווה לפנות</div></div>
          <div style="background:#fef9e7;border:1px solid #C9A84C;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">30-60 ימים</div><div style="font-size:1.6rem;font-weight:800;color:#C9A84C">${buckets['30-60'].length}</div><div style="font-size:.7rem;color:#6b7280">תוך טווח</div></div>
          <div style="background:#dcfce7;border:1px solid #16a34a;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#065f46">פחות מ-30</div><div style="font-size:1.6rem;font-weight:800;color:#16a34a">${buckets['<30'].length}</div><div style="font-size:.7rem;color:#065f46">✓ פעיל</div></div>
        </div>

        ${buckets['90+'].length ? `<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:.75rem;border-radius:6px;margin:1rem 0"><strong>🚨 ${buckets['90+'].length} לקוחות לא דיברו איתך 90+ יום</strong> — שווה לפנות עם הודעה "מה שלומך?"</div>` : ''}

        <h3 style="color:#1B3A6B">לקוחות לתשומת לב (90+ ימים)</h3>
        <table style="width:100%;font-size:.9rem;border-collapse:collapse">
          <thead style="background:#1B3A6B;color:#fff"><tr><th style="padding:.5rem;text-align:right">לקוח</th><th>פגישה אחרונה</th><th>ימים</th><th>פעולה</th></tr></thead>
          <tbody>${buckets['90+'].concat(buckets['60-90']).slice(0,30).map(x => `
            <tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:.4rem"><strong>${esc(x.c.name||'')}</strong><br><small style="color:#6b7280">${esc(x.c.phone||'')}</small></td>
              <td style="padding:.4rem;text-align:center">${x.lastSess?fmt(x.lastSess.date):'אין'}</td>
              <td style="padding:.4rem;text-align:center"><span style="color:${x.days>=90?'#dc2626':'#f59e0b'};font-weight:700">${x.days}</span></td>
              <td style="padding:.4rem;text-align:center">${x.c.phone?`<a href="https://wa.me/${x.c.phone.replace(/\D/g,'').replace(/^0/,'972')}?text=${encodeURIComponent('שלום ' + (x.c.name?.split(' ')[0]||'') + ', מה שלומך? עבר זמן... רציתי לבדוק מה איתך.')}" target="_blank" rel="noopener" style="background:#25D366;color:#fff;padding:.25rem .6rem;border-radius:50px;text-decoration:none;font-size:.8rem">📱</a>`:'—'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      `;
    },

    // 3. Retention Analysis
    retention(root) {
      const sessions = State.sessions || [];
      const clients = State.clients || [];

      // Cohort analysis: clients who started in month X — how many were still active 1/3/6/12 months later
      const cohorts = {};
      clients.forEach(c => {
        if (!c.createdAt && !c.startDate) return;
        const start = c.createdAt || c.startDate;
        const cohort = monthKey(start);
        cohorts[cohort] = cohorts[cohort] || [];
        const sess = sessions.filter(s => s.clientId === c.id && s.status==='completed');
        const lastSess = sess.length ? sess.map(s => s.date).sort().reverse()[0] : start;
        const tenure = daysBetween(start, lastSess);
        cohorts[cohort].push({ tenure, sessCount: sess.length });
      });

      // Calculate retention buckets
      const rows = Object.entries(cohorts).sort().slice(-12).map(([k, cs]) => {
        const total = cs.length;
        const r30 = cs.filter(c => c.tenure >= 30).length;
        const r90 = cs.filter(c => c.tenure >= 90).length;
        const r180 = cs.filter(c => c.tenure >= 180).length;
        const avgSess = cs.reduce((s,c) => s+c.sessCount, 0) / Math.max(total,1);
        return { cohort: k, total, r30, r90, r180, avgSess };
      });

      const overallRetention30 = rows.reduce((s,r) => s+r.r30, 0) / Math.max(rows.reduce((s,r) => s+r.total, 0), 1);
      const overallRetention90 = rows.reduce((s,r) => s+r.r90, 0) / Math.max(rows.reduce((s,r) => s+r.total, 0), 1);
      const overallAvgSess = rows.length ? rows.reduce((s,r) => s+r.avgSess, 0) / rows.length : 0;

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">🔄 ניתוח שימור (Retention)</h2>
        <p style="color:#6b7280">כמה לקוחות נשארים פעילים אחרי X ימים מההצטרפות</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin:1rem 0">
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">שימור 30 יום</div><div style="font-size:1.6rem;font-weight:800;color:${overallRetention30>=0.6?'#16a34a':overallRetention30>=0.4?'#f59e0b':'#dc2626'}">${pct(overallRetention30)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">שימור 90 יום</div><div style="font-size:1.6rem;font-weight:800;color:${overallRetention90>=0.4?'#16a34a':overallRetention90>=0.25?'#f59e0b':'#dc2626'}">${pct(overallRetention90)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">פגישות ממוצע פר לקוח</div><div style="font-size:1.6rem;font-weight:800;color:#1B3A6B">${overallAvgSess.toFixed(1)}</div></div>
        </div>

        ${overallRetention90 < 0.3 ? '<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:.75rem;border-radius:6px"><strong>⚠️ שימור 90 יום נמוך</strong> — שווה לבדוק: האם לקוחות מסיימים מוקדם? איך משפרים את הקשר?</div>' : ''}
        ${overallAvgSess < 4 ? '<div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:.75rem;border-radius:6px"><strong>💡 ממוצע פגישות נמוך</strong> — שווה לבדוק האם יש drop-off אחרי הפגישה ה-3-4</div>' : ''}

        <h3 style="color:#1B3A6B">פירוט פר חודש קוהורט</h3>
        <table style="width:100%;font-size:.85rem;border-collapse:collapse">
          <thead style="background:#1B3A6B;color:#fff"><tr><th style="padding:.5rem">חודש</th><th>חדשים</th><th>שימור 30י</th><th>שימור 90י</th><th>שימור 180י</th><th>ממוצע פגישות</th></tr></thead>
          <tbody>${rows.map(r => `
            <tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:.4rem">${fmtMonth(r.cohort+'-01')}</td>
              <td style="padding:.4rem;text-align:center">${r.total}</td>
              <td style="padding:.4rem;text-align:center">${r.r30}/${r.total} (${pct(r.r30/r.total)})</td>
              <td style="padding:.4rem;text-align:center">${r.r90}/${r.total} (${pct(r.r90/r.total)})</td>
              <td style="padding:.4rem;text-align:center">${r.r180}/${r.total} (${pct(r.r180/r.total)})</td>
              <td style="padding:.4rem;text-align:center">${r.avgSess.toFixed(1)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      `;
    },

    // 4. No-show analysis
    noShows(root) {
      const sessions = State.sessions || [];
      const clients = State.clients || [];
      const noShows = sessions.filter(s => s.status === 'no-show');
      const cancelled = sessions.filter(s => s.status === 'cancelled');
      const completed = sessions.filter(s => s.status === 'completed');
      const total = noShows.length + completed.length + cancelled.length;
      const noShowRate = total ? noShows.length / total : 0;

      // By client
      const byClient = {};
      noShows.forEach(s => {
        byClient[s.clientId] = (byClient[s.clientId]||0) + 1;
      });
      const topNoShows = Object.entries(byClient)
        .map(([id,n]) => ({ c: clients.find(c => c.id === id), count: n }))
        .filter(x => x.c)
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);

      // By day of week
      const byDay = [0,0,0,0,0,0,0];
      const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
      noShows.forEach(s => {
        if (!s.date) return;
        byDay[new Date(s.date).getDay()]++;
      });

      // Lost revenue
      const lostRev = noShows.reduce((s,x) => s + (Number(x.price)||0), 0);

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">❌ ניתוח Did-Not-Show</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin:1rem 0">
          <div style="background:${noShowRate>0.1?'#fee2e2':'#fff'};border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">No-show Rate</div><div style="font-size:1.6rem;font-weight:800;color:${noShowRate>0.1?'#dc2626':noShowRate>0.05?'#f59e0b':'#16a34a'}">${pct(noShowRate)}</div><div style="font-size:.7rem;color:#6b7280">${noShows.length} מתוך ${total}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">סך No-Show</div><div style="font-size:1.6rem;font-weight:800;color:#dc2626">${noShows.length}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">בוטלו</div><div style="font-size:1.6rem;font-weight:800;color:#f59e0b">${cancelled.length}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">הכנסה אבודה</div><div style="font-size:1.6rem;font-weight:800;color:#dc2626">${ils(lostRev)}</div></div>
        </div>

        ${noShowRate > 0.1 ? '<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:.75rem;border-radius:6px"><strong>🚨 No-show rate גבוה (10%+)</strong> — הצעות: 1) שלח תזכורת SMS אוטומטית 24h מראש 2) קח מקדמה לפגישות ראשונות 3) מדיניות חיוב על ביטולים פחות מ-24h</div>' : ''}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin-top:1rem">
          <div>
            <h3 style="color:#1B3A6B">🏆 לקוחות עם No-Show גבוה</h3>
            ${topNoShows.length ? `<table style="width:100%;font-size:.85rem">
              ${topNoShows.map(x => `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.4rem"><strong>${esc(x.c.name||'')}</strong></td><td style="padding:.4rem;text-align:center;color:#dc2626;font-weight:700">${x.count}</td></tr>`).join('')}
            </table>` : '<p style="color:#6b7280">אין נתונים</p>'}
          </div>
          <div>
            <h3 style="color:#1B3A6B">📅 פילוח לפי יום בשבוע</h3>
            ${barChart(days.map((d,i) => ({ label: d, value: byDay[i], color: byDay[i] === Math.max(...byDay) ? '#dc2626' : '#1B3A6B' })))}
          </div>
        </div>
      `;
    },

    // 5. Personal Client Report (for the client)
    personalReport(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) { alert('לקוח לא נמצא'); return; }
      const sessions = (State.sessions||[]).filter(s => s.clientId === clientId);
      const completed = sessions.filter(s => s.status === 'completed');
      const paid = completed.filter(s => s.paid);
      const totalPaid = paid.reduce((sum,s) => sum + Number(s.price||0), 0);
      const outcomes = JSON.parse(localStorage.getItem('argaman_outcomes')||'[]').filter(o => o.clientId === clientId);
      const phq = outcomes.filter(o => o.type === 'PHQ-9');
      const gad = outcomes.filter(o => o.type === 'GAD-7');

      const html = `
        <h2>סיכום תהליך טיפול — ${esc(c.name||'')}</h2>
        <p style="color:#6b7280">${esc(c.type||'')} · מ-${fmt(c.createdAt||c.startDate||'')} עד היום</p>

        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">פגישות שהושלמו</div><div class="kpi-value">${completed.length}</div></div>
          <div class="kpi"><div class="kpi-label">פגישות ששולמו</div><div class="kpi-value">${paid.length}</div></div>
          <div class="kpi"><div class="kpi-label">משך טיפול</div><div class="kpi-value">${c.createdAt?Math.round(daysBetween(c.createdAt,new Date())/30):'—'}<small>חודשים</small></div></div>
        </div>

        ${phq.length || gad.length ? `<h3>📊 התקדמות במדדים קליניים</h3>
        ${phq.length ? `<h4>PHQ-9 (דיכאון)</h4>${lineChart(phq.map(o => ({ label: fmt(o.date), value: o.total })), { color:'#1B3A6B' })}
        <p style="font-size:.85rem;color:#6b7280">ציון התחלתי: ${phq[0].total} → ציון נוכחי: ${phq[phq.length-1].total} (${phq[phq.length-1].total < phq[0].total ? '▼ שיפור' : '▲ עלייה'})</p>` : ''}
        ${gad.length ? `<h4>GAD-7 (חרדה)</h4>${lineChart(gad.map(o => ({ label: fmt(o.date), value: o.total })), { color:'#8B4C8C' })}
        <p style="font-size:.85rem;color:#6b7280">ציון התחלתי: ${gad[0].total} → ציון נוכחי: ${gad[gad.length-1].total}</p>` : ''}` : ''}

        ${c.treatment?.goals?.length ? `<h3>🎯 יעדי הטיפול</h3>
        <ul>${c.treatment.goals.map(g => `<li>${esc(g.text)} ${g.status==='achieved'?'<strong style="color:#16a34a">✓ הושג</strong>':g.status==='progress'?'<em style="color:#f59e0b">בהתקדמות</em>':''}</li>`).join('')}</ul>` : ''}

        <h3>💰 סיכום תשלומים</h3>
        <table>
          <thead><tr><th>תאריך</th><th>סוג</th><th>סכום</th></tr></thead>
          <tbody>${paid.slice(0,20).map(s => `<tr><td>${fmt(s.date)}</td><td>פגישה</td><td>${ils(s.price||0)}</td></tr>`).join('')}</tbody>
          <tfoot><tr style="background:#f3f4f6"><td colspan="2"><strong>סה״כ ששולם</strong></td><td><strong>${ils(totalPaid)}</strong></td></tr></tfoot>
        </table>

        <div class="insight" style="margin-top:2rem">
          <strong>הערה:</strong> דוח זה הוא סיכום מנהלתי. לסיכום קליני מפורט יש לפנות ישירות לגל ממן.
        </div>
      `;
      printReport(`דוח אישי — ${c.name}`, html);
    }
  };

  // =====================================================
  // FINANCIAL REPORTS
  // =====================================================
  const FinancialReports = {
    // 6. P&L
    pnl(root) {
      const sessions = State.sessions || [];
      const now = today();
      const thisYear = now.getFullYear();
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const m = monthKey(d);
        const sess = sessions.filter(s => monthKey(s.date) === m);
        const revenue = sess.filter(s => s.paid).reduce((sum,s) => sum + Number(s.price||0), 0);
        const sessCount = sess.filter(s => s.status === 'completed').length;
        const noShowLoss = sess.filter(s => s.status === 'no-show').reduce((sum,s) => sum + Number(s.price||0), 0);
        const outstanding = sess.filter(s => s.status==='completed' && !s.paid).reduce((sum,s) => sum + Number(s.price||0), 0);
        months.push({ month: m, label: fmtMonth(d), revenue, sessCount, noShowLoss, outstanding });
      }
      const totalRev = months.reduce((s,m) => s + m.revenue, 0);
      const totalSess = months.reduce((s,m) => s + m.sessCount, 0);

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">💼 דוח רווח והפסד — 12 חודשים אחרונים</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.5rem;margin:1rem 0">
          <div style="background:linear-gradient(135deg,#1B3A6B,#2C5F8B);color:#fff;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">סה״כ הכנסות 12ח׳</div><div style="font-size:1.8rem;font-weight:800">${ils(totalRev)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">ממוצע חודשי</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${ils(totalRev/12)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">פגישות סה״כ</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${totalSess}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">ממוצע פגישה</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${ils(totalSess?totalRev/totalSess:0)}</div></div>
        </div>

        <h3 style="color:#1B3A6B">מגמה</h3>
        ${lineChart(months.map(m => ({ label: m.label, value: m.revenue })), { fmt: ils, color:'#1B3A6B' })}

        <h3 style="color:#1B3A6B;margin-top:1.5rem">פירוט חודשי</h3>
        <table style="width:100%;font-size:.85rem;border-collapse:collapse">
          <thead style="background:#1B3A6B;color:#fff"><tr><th style="padding:.5rem">חודש</th><th>פגישות</th><th>הכנסות</th><th>חוב פתוח</th><th>אבדן No-Show</th></tr></thead>
          <tbody>${months.map(m => `
            <tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:.4rem"><strong>${m.label}</strong></td>
              <td style="padding:.4rem;text-align:center">${m.sessCount}</td>
              <td style="padding:.4rem;text-align:center;color:#16a34a;font-weight:700">${ils(m.revenue)}</td>
              <td style="padding:.4rem;text-align:center;color:#f59e0b">${ils(m.outstanding)}</td>
              <td style="padding:.4rem;text-align:center;color:#dc2626">${ils(m.noShowLoss)}</td>
            </tr>
          `).join('')}</tbody>
          <tfoot><tr style="background:#f3f4f6;font-weight:700"><td style="padding:.5rem">סה״כ</td><td style="text-align:center">${totalSess}</td><td style="text-align:center;color:#16a34a">${ils(totalRev)}</td><td style="text-align:center;color:#f59e0b">${ils(months.reduce((s,m)=>s+m.outstanding,0))}</td><td style="text-align:center;color:#dc2626">${ils(months.reduce((s,m)=>s+m.noShowLoss,0))}</td></tr></tfoot>
        </table>
      `;
    },

    // 7. Aging Receivables
    aging(root) {
      const sessions = State.sessions || [];
      const clients = State.clients || [];
      const now = today();
      const unpaid = sessions.filter(s => s.status === 'completed' && !s.paid && s.price);
      const buckets = { '0-30':[], '30-60':[], '60-90':[], '90+':[] };
      unpaid.forEach(s => {
        const days = daysBetween(s.date, now);
        const key = days < 30 ? '0-30' : days < 60 ? '30-60' : days < 90 ? '60-90' : '90+';
        buckets[key].push({ s, days, client: clients.find(c => c.id === s.clientId) });
      });
      const totals = Object.fromEntries(Object.entries(buckets).map(([k,v]) => [k, v.reduce((sum,x) => sum + Number(x.s.price||0), 0)]));
      const grandTotal = Object.values(totals).reduce((a,b) => a+b, 0);

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">⏰ Aging — גילו של החוב הפתוח</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin:1rem 0">
          <div style="background:#dcfce7;border:1px solid #16a34a;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#065f46">0-30 ימים</div><div style="font-size:1.4rem;font-weight:800;color:#16a34a">${ils(totals['0-30'])}</div><div style="font-size:.7rem">${buckets['0-30'].length} פגישות</div></div>
          <div style="background:#fef3c7;border:1px solid #f59e0b;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#854d0e">30-60 ימים</div><div style="font-size:1.4rem;font-weight:800;color:#f59e0b">${ils(totals['30-60'])}</div><div style="font-size:.7rem">${buckets['30-60'].length} פגישות</div></div>
          <div style="background:#fed7aa;border:1px solid #ea580c;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#7c2d12">60-90 ימים</div><div style="font-size:1.4rem;font-weight:800;color:#ea580c">${ils(totals['60-90'])}</div><div style="font-size:.7rem">${buckets['60-90'].length} פגישות</div></div>
          <div style="background:#fee2e2;border:1px solid #dc2626;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#991b1b">90+ ימים 🚨</div><div style="font-size:1.4rem;font-weight:800;color:#dc2626">${ils(totals['90+'])}</div><div style="font-size:.7rem">${buckets['90+'].length} פגישות</div></div>
        </div>
        <div style="background:#1B3A6B;color:#fff;padding:1rem;border-radius:8px;text-align:center;margin-bottom:1rem">
          <div style="font-size:.85rem;opacity:.85">סה״כ חוב פתוח</div>
          <div style="font-size:2rem;font-weight:800">${ils(grandTotal)}</div>
        </div>
        ${totals['90+'] > 0 ? '<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:.75rem;border-radius:6px"><strong>🚨 חובות מעל 90 יום הם בסיכון גבוה</strong> — מומלץ ליצור קשר מיידי</div>' : ''}
        ${Object.entries(buckets).reverse().map(([k,arr]) => arr.length ? `
          <h3 style="color:#1B3A6B;margin-top:1.5rem">${k} ימים (${arr.length})</h3>
          <table style="width:100%;font-size:.85rem"><thead style="background:#f3f4f6"><tr><th style="padding:.4rem;text-align:right">לקוח</th><th>תאריך</th><th>ימים</th><th>סכום</th></tr></thead>
          <tbody>${arr.map(x => `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.4rem"><strong>${esc(x.client?.name||'—')}</strong></td><td style="padding:.4rem;text-align:center">${fmt(x.s.date)}</td><td style="padding:.4rem;text-align:center">${x.days}</td><td style="padding:.4rem;text-align:center;font-weight:700">${ils(x.s.price)}</td></tr>`).join('')}</tbody></table>
        ` : '').join('')}
      `;
    },

    // 8. Revenue by service type
    serviceMix(root) {
      const sessions = State.sessions || [];
      const clients = State.clients || [];
      const now = today();
      const thisYear = now.getFullYear();
      const breakdown = {};
      sessions.filter(s => s.paid && new Date(s.date).getFullYear() === thisYear).forEach(s => {
        const c = clients.find(x => x.id === s.clientId);
        const type = c?.type || 'אחר';
        breakdown[type] = breakdown[type] || { revenue: 0, sessions: 0 };
        breakdown[type].revenue += Number(s.price||0);
        breakdown[type].sessions++;
      });
      const total = Object.values(breakdown).reduce((s,x) => s + x.revenue, 0);
      const sorted = Object.entries(breakdown).map(([t,d]) => ({ type:t, ...d, pct: total?d.revenue/total:0 })).sort((a,b) => b.revenue - a.revenue);

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">📊 פילוח הכנסות לפי סוג שירות (${thisYear})</h2>
        <div style="background:#1B3A6B;color:#fff;padding:1rem;border-radius:8px;text-align:center;margin-bottom:1rem">
          <div style="font-size:.85rem;opacity:.85">סה״כ הכנסות השנה</div>
          <div style="font-size:2rem;font-weight:800">${ils(total)}</div>
        </div>
        ${sorted.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem;margin-bottom:1rem">${sorted.map(s => `
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px">
            <div style="font-size:.8rem;color:#6b7280">${esc(s.type)}</div>
            <div style="font-size:1.6rem;font-weight:800;color:#1B3A6B">${ils(s.revenue)}</div>
            <div style="font-size:.85rem;color:#6b7280">${s.sessions} פגישות · ${pct(s.pct)}</div>
          </div>
        `).join('')}</div>` : '<p>אין נתונים השנה עדיין</p>'}
        ${barChart(sorted.map(s => ({ label: s.type + ' (' + s.sessions + ')', value: s.revenue, color:'#1B3A6B' })), { fmt: ils })}
      `;
    }
  };

  // =====================================================
  // GROWTH & MARKETING REPORTS
  // =====================================================
  const GrowthReports = {
    // 9. MRR / YoY
    mrrYoy(root) {
      const sessions = State.sessions || [];
      const now = today();
      const thisYear = now.getFullYear();
      const lastYear = thisYear - 1;
      const ytd = sessions.filter(s => s.paid && new Date(s.date).getFullYear() === thisYear && new Date(s.date) <= now).reduce((s,x) => s + Number(x.price||0), 0);
      const lastYtdSamePeriod = sessions.filter(s => {
        if (!s.paid) return false;
        const d = new Date(s.date);
        const samePeriodEnd = new Date(lastYear, now.getMonth(), now.getDate());
        return d.getFullYear() === lastYear && d <= samePeriodEnd;
      }).reduce((s,x) => s + Number(x.price||0), 0);
      const yoy = lastYtdSamePeriod ? (ytd - lastYtdSamePeriod) / lastYtdSamePeriod : 0;

      // MRR projection
      const last3Months = [0,1,2].map(i => {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        return sessions.filter(s => monthKey(s.date) === monthKey(d) && s.paid).reduce((sum,s) => sum + Number(s.price||0), 0);
      });
      const mrr = last3Months.reduce((a,b) => a+b, 0) / 3;
      const arr = mrr * 12;

      // Quarterly comparison
      const quarters = [];
      for (let q = 3; q >= 0; q--) {
        const startMonth = now.getMonth() - q*3 - 2;
        const s = sessions.filter(x => {
          const d = new Date(x.date);
          const diff = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
          return diff >= -q*3 - 2 && diff <= -q*3 && x.paid;
        }).reduce((sum,x) => sum + Number(x.price||0), 0);
        const dEnd = new Date(now.getFullYear(), now.getMonth() - q*3, 1);
        quarters.push({ label: 'Q' + (Math.floor(dEnd.getMonth()/3)+1) + ' ' + (dEnd.getFullYear()%100), value: s });
      }

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">📈 צמיחה — MRR, YoY ותחזית</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem;margin:1rem 0">
          <div style="background:linear-gradient(135deg,#1B3A6B,#2C5F8B);color:#fff;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">MRR (ממוצע 3ח׳)</div><div style="font-size:1.8rem;font-weight:800">${ils(mrr)}</div></div>
          <div style="background:linear-gradient(135deg,#C9A84C,#8B7239);color:#fff;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">ARR צפוי</div><div style="font-size:1.8rem;font-weight:800">${ils(arr)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">YTD ${thisYear}</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${ils(ytd)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">צמיחה YoY</div><div style="font-size:1.8rem;font-weight:800;color:${yoy>=0?'#16a34a':'#dc2626'}">${yoy>=0?'▲':'▼'} ${pct(Math.abs(yoy))}</div></div>
        </div>

        ${yoy >= 0.2 ? '<div style="background:#dcfce7;border-right:4px solid #16a34a;padding:.75rem;border-radius:6px"><strong>🚀 צמיחה מצוינת!</strong> צמיחה של 20%+ YoY — שווה לחשוב על הרחבת קליניקה / סדנאות / שותף</div>' : yoy < -0.1 ? '<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:.75rem;border-radius:6px"><strong>⚠️ ירידה</strong> — שווה לבדוק: שיווק, מחירים, ערוצי הגעה</div>' : ''}

        <h3 style="color:#1B3A6B">השוואה רבעונית</h3>
        ${barChart(quarters, { fmt: ils, color:'#1B3A6B' })}
      `;
    },

    // 10. Marketing Funnel
    funnel(root) {
      const leads = State.leads || [];
      const clients = State.clients || [];
      const sessions = State.sessions || [];
      const totalLeads = leads.length;
      const converted = leads.filter(l => l.status === 'converted' || l.convertedAt).length;
      const activeClients = clients.filter(c => c.status === 'active').length;
      const completedClients = clients.filter(c => c.status === 'completed').length;
      const convRate = totalLeads ? converted/totalLeads : 0;

      // By source
      const sources = {};
      leads.forEach(l => {
        const src = l.source || 'אחר';
        sources[src] = sources[src] || { total: 0, converted: 0 };
        sources[src].total++;
        if (l.status === 'converted' || l.convertedAt) sources[src].converted++;
      });
      const sourceList = Object.entries(sources).map(([k,v]) => ({ source:k, ...v, rate: v.total?v.converted/v.total:0 })).sort((a,b) => b.total - a.total);

      // Lead response time
      const responseTimes = leads.filter(l => l.firstContact && l.createdAt).map(l => daysBetween(l.createdAt, l.firstContact));
      const avgResponse = responseTimes.length ? responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length : null;

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">🎯 משפך שיווק והמרה</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.5rem;margin:1rem 0">
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">סך לידים</div><div style="font-size:1.6rem;font-weight:800;color:#1B3A6B">${totalLeads}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">המרה כללית</div><div style="font-size:1.6rem;font-weight:800;color:${convRate>=0.3?'#16a34a':convRate>=0.15?'#f59e0b':'#dc2626'}">${pct(convRate)}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">לקוחות פעילים</div><div style="font-size:1.6rem;font-weight:800;color:#16a34a">${activeClients}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:.75rem;border-radius:8px"><div style="font-size:.75rem;color:#6b7280">סיימו תהליך</div><div style="font-size:1.6rem;font-weight:800;color:#C9A84C">${completedClients}</div></div>
        </div>

        ${avgResponse !== null ? `<div style="background:${avgResponse<=1?'#dcfce7':avgResponse<=2?'#fef3c7':'#fee2e2'};border-right:4px solid ${avgResponse<=1?'#16a34a':avgResponse<=2?'#f59e0b':'#dc2626'};padding:.75rem;border-radius:6px;margin:1rem 0"><strong>⏱️ זמן תגובה ממוצע לליד:</strong> ${avgResponse.toFixed(1)} ימים${avgResponse > 1 ? ' — לידים מתקררים אחרי 24 שעות. מומלץ לחזור באותו יום.' : ''}</div>` : ''}

        <h3 style="color:#1B3A6B">מקורות לידים</h3>
        ${sourceList.length ? `<table style="width:100%;font-size:.9rem">
          <thead style="background:#1B3A6B;color:#fff"><tr><th style="padding:.5rem;text-align:right">מקור</th><th>לידים</th><th>הומרו</th><th>שיעור</th></tr></thead>
          <tbody>${sourceList.map(s => `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.4rem"><strong>${esc(s.source)}</strong></td><td style="padding:.4rem;text-align:center">${s.total}</td><td style="padding:.4rem;text-align:center">${s.converted}</td><td style="padding:.4rem;text-align:center;font-weight:700;color:${s.rate>=0.3?'#16a34a':s.rate>=0.15?'#f59e0b':'#dc2626'}">${pct(s.rate)}</td></tr>`).join('')}</tbody>
        </table>
        ${sourceList[0] ? `<div style="background:#dcfce7;border-right:4px solid #16a34a;padding:.75rem;border-radius:6px;margin-top:.75rem"><strong>🏆 המקור הכי טוב:</strong> ${esc(sourceList[0].source)} — ${sourceList[0].total} לידים, ${pct(sourceList[0].rate)} המרה</div>` : ''}
        ` : '<p>אין נתוני מקור</p>'}
      `;
    },

    // 11. Capacity Utilization
    capacity(root) {
      const sessions = State.sessions || [];
      // Reasonable default for clinic: 6 days × 10h × 1.25h per session = ~48 slots/week
      // Adjustable by changing this value below
      const SESSION_DURATION_MIN = 75; // 60 min session + 15 min buffer
      const WORKING_DAYS = 6; // Sun-Fri
      const WORKING_HOURS_PER_DAY = 10; // 09:00-19:00
      const weeklySlots = Math.floor(WORKING_DAYS * WORKING_HOURS_PER_DAY * 60 / SESSION_DURATION_MIN);

      // Sessions per week (last 4 weeks)
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const end = new Date(); end.setDate(end.getDate() - i*7);
        const start = new Date(end); start.setDate(start.getDate() - 7);
        const sess = sessions.filter(s => {
          const d = new Date(s.date);
          return d >= start && d < end && (s.status === 'completed' || s.status === 'scheduled');
        });
        weeks.push({ label: `שבוע ${4-i}`, value: sess.length, slots: weeklySlots });
      }
      const avgSess = weeks.reduce((s,w) => s + w.value, 0) / weeks.length;
      const utilization = weeklySlots ? avgSess/weeklySlots : 0;

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">📅 ניצולת קלנדר (Capacity)</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem;margin:1rem 0">
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">סלוטים שבועיים זמינים</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${weeklySlots}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">ממוצע פגישות/שבוע</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${avgSess.toFixed(1)}</div></div>
          <div style="background:linear-gradient(135deg,${utilization>=0.7?'#dc2626':utilization>=0.5?'#16a34a':'#1B3A6B'},${utilization>=0.7?'#991b1b':utilization>=0.5?'#15803d':'#152C52'});color:#fff;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">ניצולת</div><div style="font-size:1.8rem;font-weight:800">${pct(utilization)}</div></div>
        </div>

        ${utilization >= 0.8 ? '<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:.75rem;border-radius:6px"><strong>🚨 ניצולת מעל 80% — סיכון לשחיקה</strong>. שווה לחשוב על: העלאת מחיר, חלוקת לידים, גיוס מטפל נוסף.</div>' : utilization >= 0.6 ? '<div style="background:#dcfce7;border-right:4px solid #16a34a;padding:.75rem;border-radius:6px"><strong>✓ ניצולת בריאה (60-80%)</strong>. יש מקום לגדול אבל גם זמן לעצמך.</div>' : '<div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:.75rem;border-radius:6px"><strong>📈 ניצולת מתחת ל-60%</strong>. שווה להגדיל שיווק או לעבור על דפי נחיתה.</div>'}

        <h3 style="color:#1B3A6B">4 שבועות אחרונים</h3>
        ${lineChart(weeks, { color:'#1B3A6B', minMax: weeklySlots })}
      `;
    }
  };

  // =====================================================
  // PRODUCTIVITY REPORTS
  // =====================================================
  const ProductivityReports = {
    // 12. Time analysis
    timeAnalysis(root) {
      const sessions = State.sessions || [];
      // By day of week
      const byDay = [0,0,0,0,0,0,0];
      const byHour = {};
      sessions.filter(s => s.status === 'completed').forEach(s => {
        if (!s.date) return;
        byDay[new Date(s.date).getDay()]++;
        const h = parseInt((s.time||'12:00').split(':')[0]);
        byHour[h] = (byHour[h]||0) + 1;
      });
      const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
      const peakDayIdx = byDay.indexOf(Math.max(...byDay));
      const peakHour = Object.entries(byHour).sort((a,b) => b[1]-a[1])[0];

      const hourBars = [];
      for (let h = 8; h <= 22; h++) {
        hourBars.push({ label: h + ':00', value: byHour[h]||0, color: '#1B3A6B' });
      }

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">⏰ ניתוח זמן ושיא</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin:1rem 0">
          <div style="background:#1B3A6B;color:#fff;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">היום הכי עמוס</div><div style="font-size:1.6rem;font-weight:800">${days[peakDayIdx]}</div><div style="font-size:.8rem;opacity:.85">${byDay[peakDayIdx]} פגישות</div></div>
          <div style="background:#C9A84C;color:#1B3A6B;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">שעת השיא</div><div style="font-size:1.6rem;font-weight:800">${peakHour?peakHour[0]+':00':'—'}</div><div style="font-size:.8rem;opacity:.85">${peakHour?peakHour[1]+' פגישות':''}</div></div>
        </div>

        <h3 style="color:#1B3A6B">פיזור פר יום בשבוע</h3>
        ${barChart(days.map((d,i) => ({ label: d, value: byDay[i], color: i === peakDayIdx ? '#C9A84C' : '#1B3A6B' })))}

        <h3 style="color:#1B3A6B;margin-top:1.5rem">פיזור פר שעה</h3>
        ${barChart(hourBars)}

        <div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:.75rem;border-radius:6px;margin-top:1rem"><strong>💡 תובנה:</strong> שעת שיא = הזדמנות להעלות מחיר! שעה לא מבוקשת = הצעה למחיר מבצע</div>
      `;
    },

    // 13. Clinical Outcomes Aggregate
    clinicalOutcomes(root) {
      const outcomes = JSON.parse(localStorage.getItem('argaman_outcomes')||'[]');
      const clients = State.clients || [];
      const sessions = State.sessions || [];
      const phq = outcomes.filter(o => o.type === 'PHQ-9');
      const gad = outcomes.filter(o => o.type === 'GAD-7');

      // Improvement: per-client first vs last measurement
      function calcImprovement(arr) {
        const byClient = {};
        arr.forEach(o => { (byClient[o.clientId] = byClient[o.clientId] || []).push(o); });
        const improvements = [];
        Object.values(byClient).forEach(list => {
          if (list.length < 2) return;
          const sorted = list.sort((a,b) => a.date.localeCompare(b.date));
          improvements.push({ from: sorted[0].total, to: sorted[sorted.length-1].total, diff: sorted[0].total - sorted[sorted.length-1].total });
        });
        return improvements;
      }
      const phqImp = calcImprovement(phq);
      const gadImp = calcImprovement(gad);
      const avgPhqImprovement = phqImp.length ? phqImp.reduce((s,x) => s+x.diff, 0) / phqImp.length : 0;
      const avgGadImprovement = gadImp.length ? gadImp.reduce((s,x) => s+x.diff, 0) / gadImp.length : 0;
      const phqImproved = phqImp.filter(x => x.diff > 0).length;
      const gadImproved = gadImp.filter(x => x.diff > 0).length;

      // Methods used distribution (from session notes)
      const methodCount = {};
      sessions.forEach(s => {
        (s.notesData?.methods||[]).forEach(m => methodCount[m] = (methodCount[m]||0)+1);
      });
      const methodList = Object.entries(methodCount).sort((a,b) => b[1]-a[1]);

      // Risk flag frequency
      const riskCount = {};
      sessions.forEach(s => {
        (s.notesData?.risks||[]).forEach(r => riskCount[r] = (riskCount[r]||0)+1);
      });

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">🧠 דוח Outcome קליני מצטבר</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin:1rem 0">
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">מדידות PHQ-9</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${phq.length}</div><div style="font-size:.75rem;color:#6b7280">${phqImp.length} מטופלים עם follow-up</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">מדידות GAD-7</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${gad.length}</div></div>
          <div style="background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">שיפור ממוצע PHQ-9</div><div style="font-size:1.8rem;font-weight:800">${avgPhqImprovement>0?'▼ ':'▲ '}${Math.abs(avgPhqImprovement).toFixed(1)}</div><div style="font-size:.75rem;opacity:.85">${phqImproved}/${phqImp.length} השתפרו</div></div>
          <div style="background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:1rem;border-radius:12px"><div style="font-size:.8rem;opacity:.85">שיפור ממוצע GAD-7</div><div style="font-size:1.8rem;font-weight:800">${avgGadImprovement>0?'▼ ':'▲ '}${Math.abs(avgGadImprovement).toFixed(1)}</div><div style="font-size:.75rem;opacity:.85">${gadImproved}/${gadImp.length} השתפרו</div></div>
        </div>

        ${methodList.length ? `<h3 style="color:#1B3A6B">שכיחות שיטות טיפול שיושמו</h3>
        ${barChart(methodList.map(([k,n]) => ({ label: k, value: n, color: '#1B3A6B' })))}` : ''}

        ${Object.keys(riskCount).length ? `<h3 style="color:#1B3A6B;margin-top:1.5rem">🚨 שכיחות דגלי סיכון (מצטבר)</h3>
        ${barChart(Object.entries(riskCount).map(([k,n]) => ({ label: k, value: n, color:'#dc2626' })))}` : ''}
      `;
    }
  };

  // =====================================================
  // SEO & CONTENT REPORTS
  // =====================================================
  const SEOReports = {
    // 14. Content & SEO Health
    contentHealth(root) {
      const articles = State.articles || [];
      const overrides = State.article_overrides || {};
      const marketing = State.marketing?.pages || {};

      const totalArticles = articles.length;
      // Article views from pageStats
      const stats = JSON.parse(localStorage.getItem('argaman_page_stats')||'{}');
      const pageViews = Object.entries(stats).map(([url, v]) => ({ url, views: v.views||0, clicks: v.clicks||0 })).sort((a,b) => b.views - a.views);

      // Top performing pages
      const top10 = pageViews.slice(0, 10);
      const bottom10 = pageViews.filter(p => p.views > 0).slice(-10);
      const noTraffic = pageViews.filter(p => !p.views).length;

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">🔍 בריאות SEO ותוכן</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem;margin:1rem 0">
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">מאמרים פעילים</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${totalArticles}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">דפים עם מעקב</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${pageViews.length}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">צפיות סך הכל</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${pageViews.reduce((s,p) => s+p.views, 0)}</div></div>
          <div style="background:${noTraffic>10?'#fee2e2':'#fff'};border:1px solid ${noTraffic>10?'#dc2626':'#e5e7eb'};padding:1rem;border-radius:12px"><div style="font-size:.8rem;color:#6b7280">דפים ללא traffic</div><div style="font-size:1.8rem;font-weight:800;color:${noTraffic>10?'#dc2626':'#1B3A6B'}">${noTraffic}</div></div>
        </div>

        ${noTraffic > 10 ? '<div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:.75rem;border-radius:6px"><strong>💡 ' + noTraffic + ' דפים ללא traffic</strong> — שווה לבדוק SEO ולקדם דרך רשתות חברתיות</div>' : ''}

        ${top10.length ? `<h3 style="color:#1B3A6B">🏆 דפים מובילים</h3>
        <table style="width:100%;font-size:.85rem">
          <thead style="background:#1B3A6B;color:#fff"><tr><th style="padding:.5rem">#</th><th style="text-align:right">דף</th><th>צפיות</th><th>קליקים</th><th>CTR</th></tr></thead>
          <tbody>${top10.map((p,i) => `<tr style="border-bottom:1px solid #f3f4f6">
            <td style="padding:.4rem">${i+1}</td>
            <td style="padding:.4rem"><a href="${esc(p.url)}" target="_blank" rel="noopener" style="color:#1B3A6B">${esc(p.url.replace(/^https?:\/\/[^/]+/,''))}</a></td>
            <td style="padding:.4rem;text-align:center"><strong>${p.views}</strong></td>
            <td style="padding:.4rem;text-align:center">${p.clicks}</td>
            <td style="padding:.4rem;text-align:center">${p.views?pct(p.clicks/p.views):'—'}</td>
          </tr>`).join('')}</tbody>
        </table>` : '<p style="color:#6b7280">אין נתוני traffic עדיין — וודאו שמעקב Page Stats פעיל</p>'}

        <div style="background:#eff4ff;border-right:4px solid #1B3A6B;padding:.75rem;border-radius:6px;margin-top:1rem"><strong>📋 פעולות מומלצות:</strong>
        <ul style="margin:.5rem 0 0;padding-right:1.5rem">
          <li>הוספת חלון לסקירה ב-Google Search Console לקבלת נתונים מדויקים</li>
          <li>בדיקת מאמרים עם 0 traffic — שיפור meta או הוספת הפניות פנימיות</li>
          <li>חיזוק דפים מובילים עם תוכן נוסף ומקושר</li>
        </ul>
        </div>
      `;
    }
  };

  // =====================================================
  // DIAGNOSTICS & AI RECOMMENDATIONS
  // =====================================================
  const Diagnostics = {
    // 15. Auto Diagnosis & Recommendations
    generate(root) {
      const c = State.clients || [];
      const s = State.sessions || [];
      const leads = State.leads || [];
      const articles = State.articles || [];
      const now = today();
      const recommendations = [];

      // Check 1: Inactive clients
      const inactive90 = c.filter(x => {
        if (x.status === 'completed' || x.status === 'archived') return false;
        const sess = s.filter(ses => ses.clientId === x.id && ses.status === 'completed').sort((a,b) => b.date.localeCompare(a.date));
        if (!sess.length) return false;
        return daysBetween(sess[0].date, now) >= 90;
      });
      if (inactive90.length > 0) {
        recommendations.push({
          priority: 'high',
          category: '👥 לקוחות',
          title: `${inactive90.length} לקוחות לא דיברו איתך 90+ יום`,
          impact: 'שימור לקוח עולה פי 5 פחות מרכישת חדש',
          action: 'שלח הודעת "מה שלומך?" — דוח "לקוחות לא פעילים" יוצר קישורי וואטסאפ אוטומטית',
          link: 'inactive'
        });
      }

      // Check 2: Outstanding debts
      const unpaid = s.filter(x => x.status === 'completed' && !x.paid && x.price);
      const debtTotal = unpaid.reduce((sum,x) => sum + Number(x.price||0), 0);
      const debtOld = unpaid.filter(x => daysBetween(x.date, now) > 60);
      if (debtTotal > 2000) {
        recommendations.push({
          priority: 'high',
          category: '💰 פיננסי',
          title: `${ils(debtTotal)} בחובות פתוחים`,
          impact: `${debtOld.length} פגישות מעל 60 יום — סיכון גבוה לאי-גביה`,
          action: 'דוח Aging מציג פר חוב + שלח תזכורות מרוכזות',
          link: 'aging'
        });
      }

      // Check 3: No-show rate
      const completedSess = s.filter(x => x.status === 'completed');
      const noShowsAll = s.filter(x => x.status === 'no-show');
      const noShowRate = completedSess.length ? noShowsAll.length / (completedSess.length + noShowsAll.length) : 0;
      if (noShowRate > 0.1) {
        recommendations.push({
          priority: 'medium',
          category: '⏰ תפעול',
          title: `אחוז Did-Not-Show: ${pct(noShowRate)}`,
          impact: `אובדן הכנסה: ${ils(noShowsAll.reduce((sum,x) => sum + Number(x.price||0), 0))} שנה אחרונה`,
          action: 'הפעל תזכורות אוטומטיות 24h + מקדמה לפגישות ראשונות',
          link: 'noshows'
        });
      }

      // Check 4: Lead conversion
      const convRate = leads.length ? leads.filter(l => l.convertedAt || l.status === 'converted').length / leads.length : 0;
      if (leads.length > 5 && convRate < 0.2) {
        recommendations.push({
          priority: 'medium',
          category: '🎯 שיווק',
          title: `שיעור המרת לידים: ${pct(convRate)}`,
          impact: 'מתחת ל-20% — איבוד הזדמנויות',
          action: 'שפר זמן תגובה, שדרג תסריט שיחת היכרות, בדוק אילו מקורות מובילים',
          link: 'funnel'
        });
      }

      // Check 5: Pricing optimization
      const paidSess = s.filter(x => x.paid && x.price);
      const avgPrice = paidSess.length ? paidSess.reduce((sum,x) => sum + Number(x.price), 0) / paidSess.length : 0;
      const lastYearAvg = (() => {
        const ly = paidSess.filter(x => new Date(x.date).getFullYear() === now.getFullYear() - 1);
        return ly.length ? ly.reduce((sum,x) => sum + Number(x.price), 0) / ly.length : 0;
      })();
      if (lastYearAvg && avgPrice <= lastYearAvg) {
        recommendations.push({
          priority: 'low',
          category: '💡 צמיחה',
          title: 'מחיר הפגישה הממוצע לא עלה השנה',
          impact: `נשארת על ${ils(avgPrice)} — אם הוצאות עלו, רווחיות יורדת`,
          action: 'שווה לעשות עלייה זהירה של 5-10% ללקוחות חדשים בלבד',
          link: 'pnl'
        });
      }

      // Check 6: Capacity (using sensible defaults — 6 days × 10h, 75min per slot)
      const weeklySlots = Math.floor(6 * 10 * 60 / 75); // ~48 slots/week
      const last4WeeksSess = s.filter(x => {
        const d = new Date(x.date);
        return d >= daysAgo(28) && d <= now;
      }).length;
      const avgWeekly = last4WeeksSess / 4;
      const utilization = weeklySlots ? avgWeekly / weeklySlots : 0;
      if (utilization > 0.8) {
        recommendations.push({
          priority: 'high',
          category: '🚨 שחיקה',
          title: `ניצולת קלנדר: ${pct(utilization)} — סיכון לשחיקה`,
          impact: 'שחיקה = איכות טיפול יורדת, עזיבת לקוחות',
          action: 'העלה מחיר ב-10%, סנן לידים, שקול שותף נוסף',
          link: 'capacity'
        });
      } else if (utilization < 0.4 && weeklySlots > 0) {
        recommendations.push({
          priority: 'medium',
          category: '📉 שיווק',
          title: `ניצולת קלנדר נמוכה: ${pct(utilization)}`,
          impact: `${weeklySlots - Math.round(avgWeekly)} שעות פנויות בשבוע`,
          action: 'הגבר שיווק, בדוק דפי נחיתה, פרסם בקבוצות פייסבוק רלוונטיות',
          link: 'capacity'
        });
      }

      // Check 7: Outcome measures coverage
      const outcomes = JSON.parse(localStorage.getItem('argaman_outcomes')||'[]');
      const activeClientsWithOutcomes = new Set(outcomes.map(o => o.clientId));
      const activeClients = c.filter(x => x.status === 'active');
      const coverage = activeClients.length ? activeClientsWithOutcomes.size / activeClients.length : 0;
      if (activeClients.length >= 3 && coverage < 0.3) {
        recommendations.push({
          priority: 'low',
          category: '📊 קליני',
          title: `רק ${pct(coverage)} מהלקוחות הפעילים עם מדדי outcome`,
          impact: 'קשה להוכיח אפקטיביות לרגולטור / קופ״ח / לקוח חדש',
          action: 'הוסף PHQ-9 בפגישה ראשונה + חזור עליו כל 4 שבועות',
          link: 'clinical'
        });
      }

      // Check 8: SEO
      const articlesNoTraffic = (() => {
        const stats = JSON.parse(localStorage.getItem('argaman_page_stats')||'{}');
        return Object.values(stats).filter(p => !p.views).length;
      })();
      if (articlesNoTraffic > 20) {
        recommendations.push({
          priority: 'low',
          category: '🔍 SEO',
          title: `${articlesNoTraffic} דפים ללא traffic מדוד`,
          impact: 'תוכן שלא נקרא = לא משרת אף מטרה',
          action: 'בדוק SEO + הוסף לינקים פנימיים + שתף ברשתות חברתיות',
          link: 'content'
        });
      }

      // Health score
      const issues = recommendations.length;
      const highIssues = recommendations.filter(r => r.priority === 'high').length;
      const score = Math.max(0, 100 - (highIssues * 20 + (issues - highIssues) * 8));

      root.innerHTML = `
        <h2 style="color:#1B3A6B;margin-top:0">🩺 דוח אבחון לצמיחה והתחדשות</h2>

        <div style="background:linear-gradient(135deg,${score>=80?'#16a34a':score>=60?'#C9A84C':'#dc2626'},${score>=80?'#15803d':score>=60?'#8B7239':'#991b1b'});color:#fff;padding:2rem 1.5rem;border-radius:16px;text-align:center;margin-bottom:1.5rem">
          <div style="font-size:.9rem;opacity:.85;margin-bottom:.5rem">ציון בריאות עסק</div>
          <div style="font-size:5rem;font-weight:800;line-height:1">${score}</div>
          <div style="font-size:1rem;margin-top:.5rem">${score>=80?'🚀 מצב מצוין':score>=60?'✓ בריא — יש מה לשפר':'⚠️ דורש תשומת לב'}</div>
          <div style="font-size:.85rem;opacity:.85;margin-top:.5rem">${issues} נושאים לטיפול · ${highIssues} בעדיפות גבוהה</div>
        </div>

        ${recommendations.length === 0 ? '<div style="background:#dcfce7;border-right:4px solid #16a34a;padding:1.5rem;border-radius:8px;text-align:center"><strong>🎉 הכל נראה מצוין!</strong><br><small>אין המלצות פעולה. המשך כך.</small></div>' : ''}

        ${['high','medium','low'].map(p => {
          const items = recommendations.filter(r => r.priority === p);
          if (!items.length) return '';
          const colors = { high: { bg:'#fee2e2', border:'#dc2626', label:'🔴 עדיפות גבוהה' }, medium: { bg:'#fef3c7', border:'#f59e0b', label:'🟡 עדיפות בינונית' }, low: { bg:'#eff4ff', border:'#1B3A6B', label:'🔵 עדיפות נמוכה' } };
          const co = colors[p];
          return `<h3 style="color:#1B3A6B;margin-top:1.5rem">${co.label} (${items.length})</h3>
          <div style="display:flex;flex-direction:column;gap:.75rem">${items.map(r => `
            <div style="background:${co.bg};border-right:4px solid ${co.border};padding:1rem;border-radius:8px">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:.5rem;flex-wrap:wrap">
                <div style="flex:1;min-width:200px">
                  <div style="font-size:.75rem;color:#6b7280;margin-bottom:.25rem">${esc(r.category)}</div>
                  <div style="font-weight:700;color:#1f2937;margin-bottom:.25rem">${esc(r.title)}</div>
                  <div style="font-size:.85rem;color:#6b7280;margin-bottom:.5rem"><strong>השפעה:</strong> ${esc(r.impact)}</div>
                  <div style="font-size:.9rem;color:#1B3A6B"><strong>פעולה:</strong> ${esc(r.action)}</div>
                </div>
                ${r.link ? `<button onclick="ReportsEngine.open('${r.link}')" style="padding:.5rem .9rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem;white-space:nowrap">פתח דוח ←</button>` : ''}
              </div>
            </div>
          `).join('')}</div>`;
        }).join('')}
      `;
    }
  };

  // =====================================================
  // REPORTS HUB
  // =====================================================
  const HUB = [
    { id:'executive', cat:'מבט-על', icon:'📊', name:'דשבורד מנהל', desc:'KPI ראשי + תובנות', fn: Executive.render },
    { id:'diag', cat:'מבט-על', icon:'🩺', name:'אבחון לצמיחה', desc:'המלצות אוטומטיות + ציון בריאות עסק', fn: Diagnostics.generate, highlight: true },
    { id:'ltv', cat:'לקוחות', icon:'💰', name:'דירוג LTV', desc:'לקוחות לפי הכנסה כוללת', fn: ClientReports.ltv },
    { id:'inactive', cat:'לקוחות', icon:'⏰', name:'לקוחות לא פעילים', desc:'הזדמנויות לחידוש קשר', fn: ClientReports.inactive },
    { id:'retention', cat:'לקוחות', icon:'🔄', name:'שימור (Retention)', desc:'אחוז שחוזרים אחרי 30/90/180', fn: ClientReports.retention },
    { id:'noshows', cat:'לקוחות', icon:'❌', name:'No-Show Analysis', desc:'מי לא הגיע + פילוח לפי יום', fn: ClientReports.noShows },
    { id:'pnl', cat:'פיננסי', icon:'💼', name:'רווח והפסד (P&L)', desc:'12 חודשים — מגמה ופירוט', fn: FinancialReports.pnl },
    { id:'aging', cat:'פיננסי', icon:'⏳', name:'Aging — גיל החוב', desc:'חובות לפי 30/60/90 ימים', fn: FinancialReports.aging },
    { id:'mix', cat:'פיננסי', icon:'📊', name:'פילוח לפי שירות', desc:'איזה תחום מכניס הכי הרבה', fn: FinancialReports.serviceMix },
    { id:'mrr', cat:'צמיחה', icon:'📈', name:'MRR + YoY', desc:'הכנסה חודשית, צמיחה שנתית', fn: GrowthReports.mrrYoy },
    { id:'funnel', cat:'שיווק', icon:'🎯', name:'משפך המרה', desc:'לידים → לקוחות פעילים', fn: GrowthReports.funnel },
    { id:'capacity', cat:'תפעול', icon:'📅', name:'ניצולת קלנדר', desc:'אחוז סלוטים שמולאו', fn: GrowthReports.capacity },
    { id:'time', cat:'תפעול', icon:'⏰', name:'ניתוח זמן ושיא', desc:'יום ושעה הכי עמוסים', fn: ProductivityReports.timeAnalysis },
    { id:'clinical', cat:'קליני', icon:'🧠', name:'Outcome קליני מצטבר', desc:'שיפור PHQ-9/GAD-7 + שיטות', fn: ProductivityReports.clinicalOutcomes },
    { id:'content', cat:'SEO', icon:'🔍', name:'בריאות תוכן ו-SEO', desc:'דפים מובילים, traffic, חוסרים', fn: SEOReports.contentHealth },
  ];

  window.ReportsEngine = {
    hub() {
      const cats = [...new Set(HUB.map(r => r.cat))];
      const html = `
        <style>
          .rep-cat{margin-bottom:1.5rem}
          .rep-cat h3{color:#1B3A6B;border-bottom:2px solid #C9A84C;padding-bottom:.4rem;margin-bottom:.75rem}
          .rep-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem}
          .rep-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;cursor:pointer;transition:all .2s;text-align:right}
          .rep-card:hover{border-color:#1B3A6B;transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.08)}
          .rep-card.highlight{background:linear-gradient(135deg,#fef3c7,#fed7aa);border-color:#C9A84C}
          .rep-icon{font-size:2rem;margin-bottom:.5rem}
          .rep-name{font-weight:700;color:#1B3A6B;margin-bottom:.25rem}
          .rep-desc{font-size:.85rem;color:#6b7280}
        </style>
        <div id="rep-view">
          ${cats.map(cat => `<div class="rep-cat">
            <h3>${esc(cat)}</h3>
            <div class="rep-grid">
              ${HUB.filter(r => r.cat === cat).map(r => `
                <div class="rep-card ${r.highlight?'highlight':''}" onclick="ReportsEngine.open('${r.id}')">
                  <div class="rep-icon">${r.icon}</div>
                  <div class="rep-name">${esc(r.name)}</div>
                  <div class="rep-desc">${esc(r.desc)}</div>
                </div>
              `).join('')}
            </div>
          </div>`).join('')}
        </div>
      `;
      getModal()('📊 מרכז דוחות — Business Intelligence', html, { size:'xl' });
    },

    open(id) {
      const r = HUB.find(x => x.id === id);
      if (!r) return console.warn('[Reports] report not found:', id);
      const view = document.getElementById('rep-view');
      if (!view) {
        this.hub();
        setTimeout(() => this.open(id), 200);
        return;
      }
      // Loading state for instant feedback
      view.innerHTML = `
        <button onclick="ReportsEngine.hub()" style="padding:.4rem .9rem;background:#f3f4f6;color:#1B3A6B;border:0;border-radius:8px;cursor:pointer;font-weight:600;margin-bottom:1rem">← חזרה למרכז</button>
        <div id="rep-content">
          <div style="text-align:center;padding:3rem 1rem">
            <div style="display:inline-block;width:40px;height:40px;border:4px solid #f3f4f6;border-top-color:#1B3A6B;border-radius:50%;animation:repspin 0.8s linear infinite"></div>
            <p style="margin-top:1rem;color:#6b7280">מחשב נתונים...</p>
            <style>@keyframes repspin{to{transform:rotate(360deg)}}</style>
          </div>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb">
          <button onclick="ReportsEngine.printCurrent('${id}')" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">🖨️ הדפס / PDF</button>
        </div>
      `;
      // Render after paint (instant visual feedback)
      requestAnimationFrame(() => {
        const root = document.getElementById('rep-content');
        if (!root) return;
        try {
          // Check if we have data to render
          const hasClients = (State.clients||[]).length > 0;
          const hasSessions = (State.sessions||[]).length > 0;
          const hasLeads = (State.leads||[]).length > 0;
          const needsData = ['ltv','inactive','retention','noshows','pnl','aging','mix','mrr','funnel','capacity','time','clinical'];
          if (needsData.includes(id) && !hasClients && !hasSessions && !hasLeads) {
            root.innerHTML = this._emptyState(r);
            return;
          }
          r.fn(root);
          // Verify it rendered something
          if (!root.innerHTML.trim() || root.innerHTML.length < 100) {
            root.innerHTML = this._emptyState(r);
          }
        } catch(err) {
          console.error('[Reports] error rendering', id, err);
          root.innerHTML = `
            <div style="background:#fee2e2;border-right:4px solid #dc2626;padding:1.5rem;border-radius:8px">
              <h3 style="color:#991b1b;margin-bottom:.5rem">⚠️ שגיאה בהפקת הדוח</h3>
              <p style="color:#7f1d1d;font-size:.9rem">${esc(err.message||'שגיאה לא ידועה')}</p>
              <details style="margin-top:.5rem"><summary style="cursor:pointer;color:#6b7280;font-size:.85rem">פרטים טכניים</summary>
                <pre style="background:#fff;padding:.5rem;border-radius:4px;margin-top:.4rem;font-size:.75rem;overflow:auto;max-height:200px">${esc(err.stack||'')}</pre>
              </details>
              <button onclick="ReportsEngine.hub()" style="margin-top:.75rem;padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer">← חזור למרכז</button>
            </div>
          `;
        }
      });
    },

    _emptyState(r) {
      return `
        <div style="text-align:center;padding:3rem 1.5rem;background:#f9fafb;border-radius:12px">
          <div style="font-size:4rem;opacity:.4;margin-bottom:1rem">${esc(r.icon)}</div>
          <h3 style="color:#1B3A6B;margin-bottom:.5rem">${esc(r.name)}</h3>
          <p style="color:#6b7280;margin-bottom:1.5rem">${esc(r.desc)}</p>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:8px;display:inline-block;text-align:right;max-width:480px">
            <strong style="color:#1B3A6B">🎯 כדי לראות נתונים בדוח הזה, צריך:</strong>
            <ul style="margin:.5rem 0 0;padding-right:1.5rem;color:#374151;line-height:1.8">
              <li>להוסיף לקוחות (סייד-בר → 👥 לקוחות)</li>
              <li>לתעד פגישות עם תאריך + מחיר + סטטוס "הושלמה"</li>
              <li>לסמן ✓ "שולם" על פגישות ששולמו</li>
              <li>להזין לידים עם תאריך ומקור הגעה</li>
            </ul>
            <p style="margin-top:.75rem;font-size:.85rem;color:#6b7280">הדוח יתעדכן אוטומטית ברגע שיהיו נתונים.</p>
          </div>
        </div>
      `;
    },

    printCurrent(id) {
      const r = HUB.find(x => x.id === id);
      if (!r) return;
      try {
        const tmp = document.createElement('div');
        r.fn(tmp);
        if (!tmp.innerHTML.trim()) {
          tmp.innerHTML = this._emptyState(r);
        }
        printReport(r.name, tmp.innerHTML);
      } catch(err) {
        console.error('[Reports] print error', err);
        alert('שגיאה בהדפסת הדוח: ' + err.message);
      }
    },

    print(title, _, id) { this.printCurrent(id); },

    exportLTV() { ClientReports.exportLTV(); },

    personalReport(clientId) { ClientReports.personalReport(clientId); }
  };

  // Global functions
  window.openReportsHub = () => ReportsEngine.hub();
  window.openClientPersonalReport = id => ReportsEngine.personalReport(id);
  console.log('[ReportsEngine] ✓ 15 reports loaded');

  } // end start()
})();
