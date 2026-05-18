/* =====================================================
   bi-charts.js — Interactive Business Intelligence Charts
   Pure SVG, no external libs.
   ===================================================== */
(function(){
  'use strict';

  const PALETTE = ['#1B3A6B','#C9A84C','#16a34a','#8b5cf6','#dc2626','#f59e0b','#0ea5e9','#ec4899','#10b981','#6366f1'];

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /** Donut chart for lead sources */
  function donutChart(data, options = {}){
    options.size = options.size || 220;
    options.thickness = options.thickness || 35;
    const entries = Object.entries(data).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
    const total = entries.reduce((s,[,v])=>s+v, 0);
    if (total === 0) return '<div style="color:#9ca3af;padding:1rem">אין נתונים</div>';
    const cx = options.size/2, cy = options.size/2;
    const r = options.size/2 - 5, ri = r - options.thickness;
    let acc = 0;
    const arcs = entries.map(([key, val], i) => {
      const startAngle = (acc/total) * 2 * Math.PI - Math.PI/2;
      const endAngle = ((acc + val)/total) * 2 * Math.PI - Math.PI/2;
      acc += val;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const x3 = cx + ri * Math.cos(endAngle);
      const y3 = cy + ri * Math.sin(endAngle);
      const x4 = cx + ri * Math.cos(startAngle);
      const y4 = cy + ri * Math.sin(startAngle);
      const large = (endAngle - startAngle) > Math.PI ? 1 : 0;
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 ${large} 0 ${x4} ${y4} Z`;
      const color = PALETTE[i % PALETTE.length];
      return `<path d="${d}" fill="${color}"><title>${escapeHtml(key)}: ${val} (${Math.round(val/total*100)}%)</title></path>`;
    }).join('');
    const legend = entries.map(([key, val], i) => `
      <div style="display:flex;align-items:center;gap:.4rem;font-size:.8rem;padding:.2rem 0">
        <span style="width:12px;height:12px;background:${PALETTE[i%PALETTE.length]};border-radius:2px"></span>
        <span style="flex:1">${escapeHtml(key)}</span>
        <strong>${val}</strong>
        <span style="color:#9ca3af;min-width:40px;text-align:left">${Math.round(val/total*100)}%</span>
      </div>
    `).join('');
    return `
      <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">
        <svg viewBox="0 0 ${options.size} ${options.size}" style="width:${options.size}px;height:${options.size}px">
          ${arcs}
          <text x="${cx}" y="${cy-4}" text-anchor="middle" style="font-size:1.5rem;font-weight:800;fill:#1B3A6B">${total}</text>
          <text x="${cx}" y="${cy+18}" text-anchor="middle" style="font-size:.7rem;fill:#6b7280">סה"כ</text>
        </svg>
        <div style="flex:1;min-width:180px">${legend}</div>
      </div>`;
  }

  /** Calendar heat map for last 90 days of sessions */
  function calendarHeatmap(sessions){
    const today = new Date();
    const days = 90;
    const counts = {};
    sessions.forEach(s => {
      if (!s.date) return;
      counts[s.date] = (counts[s.date]||0) + 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    const cellSize = 14, gap = 3;
    const cols = Math.ceil(days/7);
    const w = cols * (cellSize + gap);
    const h = 7 * (cellSize + gap);
    const cells = [];
    for (let i = days - 1; i >= 0; i--){
      const d = new Date(today); d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0,10);
      const count = counts[iso] || 0;
      const intensity = count / max;
      const color = count === 0 ? '#f3f4f6'
        : intensity < 0.25 ? '#dbeafe'
        : intensity < 0.5 ? '#93c5fd'
        : intensity < 0.75 ? '#3b82f6'
        : '#1B3A6B';
      const idx = days - 1 - i;
      const col = Math.floor(idx/7);
      const row = idx % 7;
      cells.push(`<rect x="${col*(cellSize+gap)}" y="${row*(cellSize+gap)}" width="${cellSize}" height="${cellSize}" rx="2" fill="${color}"><title>${iso}: ${count} פגישות</title></rect>`);
    }
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px">${cells.join('')}</svg>
      <div style="display:flex;align-items:center;gap:.3rem;font-size:.7rem;color:#6b7280;margin-top:.4rem">
        פחות
        <span style="width:10px;height:10px;background:#f3f4f6;border-radius:2px"></span>
        <span style="width:10px;height:10px;background:#dbeafe;border-radius:2px"></span>
        <span style="width:10px;height:10px;background:#93c5fd;border-radius:2px"></span>
        <span style="width:10px;height:10px;background:#3b82f6;border-radius:2px"></span>
        <span style="width:10px;height:10px;background:#1B3A6B;border-radius:2px"></span>
        יותר
      </div>`;
  }

  /** Line chart for monthly revenue trend (last 6 months) */
  function revenueLineChart(sessions){
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--){
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const ym = d.toISOString().slice(0,7);
      const monthName = d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
      const rev = sessions.filter(s => s.date && s.date.startsWith(ym) && s.paid)
        .reduce((sum,s) => sum + (+s.price || 0), 0);
      months.push({ ym, label: monthName, rev });
    }
    const max = Math.max(1, ...months.map(m => m.rev));
    const w = 600, h = 200, p = 30;
    const stepX = (w - p*2) / (months.length - 1);
    const points = months.map((m, i) => ({ x: p + i*stepX, y: h - p - (m.rev/max)*(h - p*2) }));
    const path = 'M ' + points.map(p => `${p.x},${p.y}`).join(' L ');
    const area = path + ` L ${points[points.length-1].x},${h-p} L ${points[0].x},${h-p} Z`;
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px">
      <defs><linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1B3A6B" stop-opacity=".3"/><stop offset="100%" stop-color="#1B3A6B" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#revGrad)"/>
      <path d="${path}" stroke="#1B3A6B" stroke-width="2.5" fill="none"/>
      ${points.map((pt,i) => `<g><circle cx="${pt.x}" cy="${pt.y}" r="5" fill="#1B3A6B"><title>${months[i].label}: ₪${months[i].rev.toLocaleString()}</title></circle><text x="${pt.x}" y="${h-8}" text-anchor="middle" style="font-size:.75rem;fill:#6b7280">${months[i].label}</text><text x="${pt.x}" y="${pt.y-10}" text-anchor="middle" style="font-size:.7rem;fill:#1B3A6B;font-weight:700">₪${(months[i].rev/1000).toFixed(0)}k</text></g>`).join('')}
    </svg>`;
  }

  /** Source effectiveness — conversion rate per source */
  function sourceEffectiveness(leads){
    const stats = {};
    leads.forEach(l => {
      const src = l.source || 'אחר';
      if (!stats[src]) stats[src] = { total: 0, converted: 0 };
      stats[src].total++;
      if (l.status === 'converted') stats[src].converted++;
    });
    const rows = Object.entries(stats)
      .filter(([,s]) => s.total >= 2)
      .map(([src, s]) => ({ src, total: s.total, converted: s.converted, rate: Math.round(s.converted/s.total*100) }))
      .sort((a,b) => b.rate - a.rate);
    if (rows.length === 0) return '<div style="color:#9ca3af;padding:1rem">אין מספיק נתונים</div>';
    return `<table style="width:100%;font-size:.85rem">
      <thead><tr style="border-bottom:2px solid #e5e7eb">
        <th style="text-align:right;padding:.4rem">מקור</th>
        <th style="text-align:right;padding:.4rem">לידים</th>
        <th style="text-align:right;padding:.4rem">הומרו</th>
        <th style="text-align:right;padding:.4rem">% המרה</th>
      </tr></thead>
      <tbody>${rows.map((r,i) => {
        const color = r.rate >= 30 ? '#16a34a' : r.rate >= 15 ? '#1B3A6B' : '#dc2626';
        return `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:.4rem">${i===0?'🏆 ':''}${escapeHtml(r.src)}</td>
          <td style="padding:.4rem">${r.total}</td>
          <td style="padding:.4rem">${r.converted}</td>
          <td style="padding:.4rem"><strong style="color:${color}">${r.rate}%</strong></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  /** Cohort analysis — leads grouped by creation month, conversion within 90 days */
  function cohortAnalysis(leads){
    const cohorts = {};
    leads.forEach(l => {
      if (!l.createdAt) return;
      const ym = l.createdAt.slice(0,7);
      if (!cohorts[ym]) cohorts[ym] = { total: 0, converted: 0 };
      cohorts[ym].total++;
      if (l.status === 'converted') cohorts[ym].converted++;
    });
    const months = Object.keys(cohorts).sort().slice(-6);
    if (months.length === 0) return '<div style="color:#9ca3af;padding:1rem">אין נתונים מספיקים</div>';
    return `<table style="width:100%;font-size:.85rem">
      <thead><tr><th style="text-align:right;padding:.4rem">חודש</th><th style="text-align:right;padding:.4rem">לידים</th><th style="text-align:right;padding:.4rem">המרות</th><th style="text-align:right;padding:.4rem">%</th></tr></thead>
      <tbody>${months.map(ym => {
        const c = cohorts[ym];
        const rate = c.total ? Math.round(c.converted/c.total*100) : 0;
        const monthLabel = new Date(ym + '-01').toLocaleDateString('he-IL', { month:'long', year:'numeric' });
        return `<tr><td style="padding:.4rem">${monthLabel}</td><td>${c.total}</td><td>${c.converted}</td><td><strong>${rate}%</strong></td></tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  window.BICharts = { donutChart, calendarHeatmap, revenueLineChart, sourceEffectiveness, cohortAnalysis };
})();
