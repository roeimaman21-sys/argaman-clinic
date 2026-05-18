/* =====================================================
   monthly-report.js — PDF Monthly Business Report Generator
   Uses native window.print() so no external libs needed.
   ===================================================== */
(function(){
  'use strict';

  function fmt(n){ return Math.round(n).toLocaleString('he-IL'); }
  function pct(a, b){ return b > 0 ? Math.round(a/b*100) : 0; }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /** Generate a monthly business report for a given year-month (YYYY-MM) */
  function generateMonthlyReport(yearMonth){
    const State = window.State || {};
    yearMonth = yearMonth || new Date().toISOString().slice(0,7);
    const [y, m] = yearMonth.split('-').map(Number);
    const monthStart = `${yearMonth}-01`;
    const monthEnd   = new Date(y, m, 0).toISOString().slice(0,10);
    const prevYM = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
    const prevStart = `${prevYM}-01`;
    const prevEnd   = new Date(y, m-1, 0).toISOString().slice(0,10);

    const leads = State.leads || [];
    const clients = State.clients || [];
    const sessions = State.sessions || [];

    // Filter to month
    const monthLeads = leads.filter(l => (l.createdAt||'').slice(0,10) >= monthStart && (l.createdAt||'').slice(0,10) <= monthEnd);
    const prevLeads = leads.filter(l => (l.createdAt||'').slice(0,10) >= prevStart && (l.createdAt||'').slice(0,10) <= prevEnd);
    const monthSessions = sessions.filter(s => s.date >= monthStart && s.date <= monthEnd);
    const prevSessions  = sessions.filter(s => s.date >= prevStart && s.date <= prevEnd);

    const monthRevenue = monthSessions.filter(s => s.paid).reduce((sum,s)=>sum+(+s.price||0),0);
    const prevRevenue  = prevSessions.filter(s => s.paid).reduce((sum,s)=>sum+(+s.price||0),0);
    const monthExpected = monthSessions.reduce((sum,s)=>sum+(+s.price||0),0);
    const monthOutstanding = monthExpected - monthRevenue;

    const monthConv = monthLeads.filter(l => l.status === 'converted').length;
    const monthLost = monthLeads.filter(l => l.status === 'lost').length;

    // Source breakdown
    const sourceMap = {};
    monthLeads.forEach(l => {
      const src = l.source || 'אחר';
      sourceMap[src] = (sourceMap[src]||0) + 1;
    });
    const topSources = Object.entries(sourceMap).sort((a,b)=>b[1]-a[1]).slice(0, 5);

    // Topic breakdown
    const topicMap = {};
    monthLeads.forEach(l => {
      const t = l.topic || 'לא צוין';
      topicMap[t] = (topicMap[t]||0) + 1;
    });
    const topTopics = Object.entries(topicMap).sort((a,b)=>b[1]-a[1]).slice(0, 5);

    // Daily sessions chart data
    const daysInMonth = new Date(y, m, 0).getDate();
    const dailyCounts = new Array(daysInMonth).fill(0);
    monthSessions.forEach(s => {
      const d = parseInt(s.date.slice(8,10), 10);
      if (d >= 1 && d <= daysInMonth) dailyCounts[d-1]++;
    });
    const maxDaily = Math.max(1, ...dailyCounts);

    // Build PDF-ready HTML
    const monthName = new Date(y, m-1, 1).toLocaleDateString('he-IL', { month:'long', year:'numeric' });
    const revChange = pct(monthRevenue - prevRevenue, prevRevenue);
    const leadsChange = pct(monthLeads.length - prevLeads.length, prevLeads.length);

    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head>
      <meta charset="utf-8">
      <title>דוח חודשי — ${monthName} — קליניקת ארגמן</title>
      <style>
        @media print { @page { size: A4; margin: 1.2cm } }
        body { font-family: Arial,sans-serif; color:#1f2937; padding:0; margin:0 }
        .page { padding: 0 1rem }
        .cover { background:linear-gradient(135deg,#1B3A6B,#3b82f6); color:#fff; padding:2rem 1.5rem; margin-bottom:1.5rem; border-radius:0 0 12px 12px }
        .cover h1 { margin:0;font-size:2rem }
        .cover .sub { opacity:.85;font-size:.95rem;margin-top:.5rem }
        h2 { color:#1B3A6B;font-size:1.3rem;margin:2rem 0 .75rem;border-bottom:2px solid #c9a84c;padding-bottom:.4rem }
        h3 { color:#1B3A6B;font-size:1.05rem;margin:1rem 0 .5rem }
        .kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.5rem }
        .kpi { background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:.9rem .75rem;text-align:center }
        .kpi-val { font-size:1.5rem;font-weight:800;color:#1B3A6B }
        .kpi-label { font-size:.75rem;color:#6b7280;margin-top:.2rem }
        .kpi-change { font-size:.7rem;margin-top:.3rem;font-weight:600 }
        .kpi-change.up { color:#16a34a }
        .kpi-change.down { color:#dc2626 }
        table { width:100%;border-collapse:collapse;font-size:.85rem;margin-bottom:1rem }
        th { background:#1B3A6B;color:#fff;padding:.5rem;text-align:right;font-weight:600 }
        td { padding:.4rem .5rem;border-bottom:1px solid #f3f4f6 }
        tr:nth-child(even) td { background:#fafafa }
        .bar-chart { display:flex;align-items:flex-end;gap:1px;height:80px;background:#f9fafb;padding:.5rem;border-radius:6px;border:1px solid #e5e7eb }
        .bar { background:linear-gradient(180deg,#3b82f6,#1B3A6B);min-width:6px;flex:1;border-radius:2px 2px 0 0;position:relative }
        .footer { margin-top:2rem;padding:1rem;background:#f9fafb;border-top:2px solid #c9a84c;font-size:.75rem;color:#6b7280;text-align:center }
        .summary-box { background:#fef3c7;border-right:4px solid #c9a84c;padding:.75rem 1rem;border-radius:6px;margin-bottom:1rem;line-height:1.6 }
        @media print { .no-print { display:none } }
      </style></head><body>
      <div class="cover">
        <div style="font-size:.85rem;opacity:.85;margin-bottom:.3rem">דוח חודשי</div>
        <h1>${esc(monthName)}</h1>
        <div class="sub">קליניקת ארגמן · גל ממן — יועץ זוגי, מיני, משפחתי ואישי</div>
        <div class="sub" style="margin-top:.3rem;font-size:.8rem;opacity:.7">הופק ב-${new Date().toLocaleDateString('he-IL')} ע"י ${esc(window.CURRENT_USER_DISPLAY_NAME||'CRM')}</div>
      </div>

      <div class="page">
        <div class="summary-box">
          <strong>📊 סיכום מנהלים:</strong> בחודש ${esc(monthName)} התקבלו <strong>${monthLeads.length} לידים</strong> חדשים (${leadsChange>=0?'+':''}${leadsChange}% מחודש קודם), בוצעו <strong>${monthSessions.length} פגישות</strong>, וההכנסה עמדה על <strong>₪${fmt(monthRevenue)}</strong> (${revChange>=0?'+':''}${revChange}%).
          ${monthOutstanding > 0 ? ` נותרו <strong style="color:#dc2626">₪${fmt(monthOutstanding)}</strong> בחובות לגביה.` : ''}
        </div>

        <h2>📈 מדדים מרכזיים</h2>
        <div class="kpi-grid">
          <div class="kpi">
            <div class="kpi-val">${monthLeads.length}</div>
            <div class="kpi-label">לידים חדשים</div>
            <div class="kpi-change ${leadsChange>=0?'up':'down'}">${leadsChange>=0?'+':''}${leadsChange}%</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">${monthSessions.length}</div>
            <div class="kpi-label">פגישות שבוצעו</div>
            <div class="kpi-change">${monthSessions.length - prevSessions.length>=0?'+':''}${monthSessions.length - prevSessions.length} מקודם</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">₪${fmt(monthRevenue)}</div>
            <div class="kpi-label">הכנסה</div>
            <div class="kpi-change ${revChange>=0?'up':'down'}">${revChange>=0?'+':''}${revChange}%</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">${pct(monthConv, monthLeads.length)}%</div>
            <div class="kpi-label">שיעור המרה</div>
            <div class="kpi-change">${monthConv} מומרים · ${monthLost} אבודים</div>
          </div>
        </div>

        <h2>📅 התפלגות פגישות לפי יום</h2>
        <div class="bar-chart">
          ${dailyCounts.map((c,i) => `<div class="bar" style="height:${c/maxDaily*100}%" title="${i+1}: ${c}"></div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#9ca3af;margin-top:.3rem">
          <span>1</span><span>${Math.floor(daysInMonth/2)}</span><span>${daysInMonth}</span>
        </div>

        <h2>🎯 מקורות לידים מובילים</h2>
        ${topSources.length ? `<table>
          <thead><tr><th style="text-align:right">מקור</th><th style="text-align:right">לידים</th><th style="text-align:right">% מסה"כ</th></tr></thead>
          <tbody>${topSources.map(([src, count]) => `<tr>
            <td>${esc(src)}</td>
            <td>${count}</td>
            <td>${pct(count, monthLeads.length)}%</td>
          </tr>`).join('')}</tbody>
        </table>` : '<p style="color:#9ca3af">אין נתונים</p>'}

        <h2>💬 נושאים מובילים</h2>
        ${topTopics.length ? `<table>
          <thead><tr><th style="text-align:right">נושא</th><th style="text-align:right">לידים</th></tr></thead>
          <tbody>${topTopics.map(([t, count]) => `<tr>
            <td>${esc(t)}</td>
            <td>${count}</td>
          </tr>`).join('')}</tbody>
        </table>` : '<p style="color:#9ca3af">אין נתונים</p>'}

        <h2>💰 פירוט פיננסי</h2>
        <table>
          <tr><td>הכנסה ששולמה</td><td style="text-align:left"><strong>₪${fmt(monthRevenue)}</strong></td></tr>
          <tr><td>הכנסה צפויה (כולל חובות)</td><td style="text-align:left">₪${fmt(monthExpected)}</td></tr>
          <tr><td>חובות לגביה</td><td style="text-align:left;color:#dc2626"><strong>₪${fmt(monthOutstanding)}</strong></td></tr>
          <tr><td>פגישות ששולמו</td><td style="text-align:left">${monthSessions.filter(s=>s.paid).length} מתוך ${monthSessions.length}</td></tr>
          <tr><td>ממוצע לפגישה</td><td style="text-align:left">₪${monthSessions.length? fmt(monthExpected/monthSessions.length) : 0}</td></tr>
        </table>

        <div class="footer">
          © ${y} קליניקת ארגמן · גל ממן · 050-6415222 · argamanclinic.com<br>
          דוח זה הופק אוטומטית ולא הוצא ידנית. הוא חסוי ומיועד לבעלים בלבד.
        </div>
      </div>
      <script>window.onload = () => setTimeout(() => window.print(), 500)<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w){ window.toast && window.toast('הדפדפן חסם פופ-אפ', 'error'); return; }
    w.document.write(html); w.document.close();
    if (window.Audit) window.Audit.logAction('export','report',null,`דוח חודשי ${yearMonth}`);
  }

  window.MonthlyReport = { generate: generateMonthlyReport };
  window.generateMonthlyReport = generateMonthlyReport;
})();
