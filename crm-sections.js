/* =====================================================
   crm-sections.js — Full-page inline sections
   קליניקת ארגמן · הופך מודלים לדשבורדים מלאים
   ─────────────────────────────────────────────────────
   Adds renderers for:
   - financial         (full P&L dashboard)
   - funnel            (conversion analytics)
   - reports           (BI hub as full page)
   - audit             (audit log full view)
   - resources         (resources library)
   - sessions          (overrides existing to add Calendar tab)
   - settings          (consolidates: themes, 2FA, backup, hotkeys, iCal, audit)
   ===================================================== */
(function(){
  'use strict';

  function waitForState(a) {
    if (typeof State !== 'undefined' && typeof renderers !== 'undefined') return start();
    if (a > 80) return console.warn('[CRMSections] env not found');
    setTimeout(() => waitForState(a+1), 200);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForState(0));
  } else {
    waitForState(0);
  }

  function start(){

  const esc = s => String(s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));

  function setMain(html) {
    const root = document.getElementById('main-content');
    if (!root) return null;
    root.innerHTML = html;
    window.scrollTo(0, 0);
    return root;
  }

  function sectionHeader(title, subtitle, actions) {
    return `<div class="section-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <div>
        <h1 class="section-title" style="color:#1B3A6B;margin:0">${esc(title)}</h1>
        ${subtitle ? `<div class="section-subtitle" style="color:#6b7280;margin-top:.25rem">${esc(subtitle)}</div>` : ''}
      </div>
      ${actions ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap">${actions}</div>` : ''}
    </div>`;
  }

  // =====================================================
  // RENDERER: FINANCIAL DASHBOARD (full page)
  // =====================================================
  renderers.financial = function() {
    setMain(`
      ${sectionHeader('💵 דשבורד פיננסי', 'הכנסות, חובות, מגמות', `
        <button onclick="(window.CRMPlus?.Financial?.exportTax||(()=>{}))()" class="btn" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">📊 ייצוא CSV למס</button>
      `)}
      <div id="financial-content"></div>
    `);
    // Use existing Financial render
    requestAnimationFrame(() => {
      try {
        if (window.CRMPlus?.Financial?.render) {
          window.CRMPlus.Financial.render('financial-content');
        } else {
          document.getElementById('financial-content').innerHTML = '<p style="text-align:center;padding:3rem;color:#6b7280">המודול הפיננסי לא נטען. רענן את הדף.</p>';
        }
      } catch(e) {
        console.error('[financial]', e);
        document.getElementById('financial-content').innerHTML = `<div style="background:#fee2e2;padding:1rem;border-radius:8px;color:#991b1b">שגיאה: ${esc(e.message)}</div>`;
      }
    });
  };

  // =====================================================
  // RENDERER: CONVERSION FUNNEL (full page)
  // =====================================================
  renderers.funnel = function() {
    setMain(`
      ${sectionHeader('📈 משפך המרה', 'לידים → לקוחות פעילים → סיום')}
      <div id="funnel-content"></div>
    `);
    requestAnimationFrame(() => {
      try {
        // Replicate the funnel logic from CRMPlus.Funnel inline (uses getModal)
        // We need a render-to-div version. Use the data calculation directly.
        const root = document.getElementById('funnel-content');
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
        const ils = n => '₪' + Number(n||0).toLocaleString('he-IL');

        const sources = {};
        leads.forEach(l => {
          const src = l.source || 'אחר';
          sources[src] = (sources[src]||0) + 1;
        });

        const stages = [
          { name:'לידים נכנסים', count: totalLeads, color:'#1B3A6B' },
          { name:'הומרו ללקוחות', count: converted, color:'#3a8a99' },
          { name:'לקוחות פעילים', count: activeClients, color:'#16a34a' },
          { name:'סיימו בהצלחה', count: completedClients, color:'#C9A84C' }
        ];
        const maxStage = Math.max(...stages.map(s => s.count), 1);

        if (totalLeads === 0 && clients.length === 0) {
          root.innerHTML = `<div style="background:#f9fafb;padding:3rem 1.5rem;border-radius:14px;text-align:center">
            <div style="font-size:4rem;opacity:.4;margin-bottom:1rem">📈</div>
            <h3 style="color:#1B3A6B">אין נתונים עדיין</h3>
            <p style="color:#6b7280;margin-top:.5rem">הוסף לידים ולקוחות כדי לראות את משפך ההמרה</p>
            <button onclick="goto('leads')" style="margin-top:1rem;background:#1B3A6B;color:#fff;border:0;padding:.6rem 1.5rem;border-radius:50px;cursor:pointer;font-weight:600">→ לליד חדש</button>
          </div>`;
          return;
        }

        root.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem">
            <div style="background:linear-gradient(135deg,#1B3A6B,#2C5F8B);color:#fff;padding:1.25rem;border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,.08)">
              <div style="font-size:.85rem;opacity:.85">המרת לידים</div>
              <div style="font-size:2.5rem;font-weight:800">${conversionRate}%</div>
              <small style="opacity:.85">${converted}/${totalLeads}</small>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;padding:1.25rem;border-radius:14px"><div style="font-size:.85rem;color:#6b7280">ממוצע פגישות פר לקוח</div><div style="font-size:2.5rem;font-weight:800;color:#1B3A6B">${avgSessions}</div></div>
            <div style="background:#fff;border:1px solid #e5e7eb;padding:1.25rem;border-radius:14px"><div style="font-size:.85rem;color:#6b7280">LTV ממוצע</div><div style="font-size:2.5rem;font-weight:800;color:#1B3A6B">${ils(avgRevenuePerClient)}</div></div>
            <div style="background:#fff;border:1px solid #e5e7eb;padding:1.25rem;border-radius:14px"><div style="font-size:.85rem;color:#6b7280">סך הכנסות (כל הזמן)</div><div style="font-size:2.5rem;font-weight:800;color:#16a34a">${ils(totalRevenue)}</div></div>
          </div>

          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem;margin-bottom:1rem">
            <h3 style="color:#1B3A6B;margin-bottom:1rem">🔻 משפך המרה</h3>
            <div>
              ${stages.map(s => `
                <div style="margin-bottom:1rem">
                  <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
                    <span style="font-weight:700;font-size:1rem">${esc(s.name)}</span>
                    <span style="color:${s.color};font-weight:800;font-size:1.1rem">${s.count}</span>
                  </div>
                  <div style="height:28px;background:#f3f4f6;border-radius:8px;overflow:hidden">
                    <div style="height:100%;background:linear-gradient(90deg,${s.color},${s.color}cc);width:${s.count/maxStage*100}%;transition:width .5s;display:flex;align-items:center;padding:0 .75rem;color:#fff;font-weight:600">${s.count>0?s.count:''}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.5rem">
            <h3 style="color:#1B3A6B;margin-bottom:1rem">📱 מקורות לידים</h3>
            ${Object.keys(sources).length ? `<div style="display:flex;flex-wrap:wrap;gap:.5rem">
              ${Object.entries(sources).sort((a,b)=>b[1]-a[1]).map(([src,n]) => `
                <span style="background:#eff4ff;color:#1B3A6B;padding:.5rem 1rem;border-radius:50px;font-weight:600">${esc(src)} · <strong>${n}</strong></span>
              `).join('')}
            </div>` : '<p style="color:#6b7280">אין נתוני מקור עדיין. הוסף לידים עם שדה "מקור".</p>'}
          </div>
        `;
      } catch(e) {
        console.error('[funnel]', e);
        document.getElementById('funnel-content').innerHTML = `<div style="background:#fee2e2;padding:1rem;border-radius:8px;color:#991b1b">שגיאה: ${esc(e.message)}</div>`;
      }
    });
  };

  // =====================================================
  // RENDERER: REPORTS HUB (full page)
  // =====================================================
  renderers.reports = function() {
    setMain(`
      ${sectionHeader('📊 מרכז דוחות BI', '15 דוחות אוטומטיים + תובנות')}
      <div id="reports-section-content"></div>
    `);
    requestAnimationFrame(() => {
      try {
        const root = document.getElementById('reports-section-content');
        // Render the hub HTML inline
        if (!window.ReportsEngine) {
          root.innerHTML = '<p style="text-align:center;padding:3rem;color:#6b7280">מנוע הדוחות לא נטען. רענן.</p>';
          return;
        }
        // Use a fake "rep-view" container so existing logic works
        root.innerHTML = '<div id="rep-view"></div>';
        // Trigger hub render — but it uses getModal! We need to render directly.
        // Workaround: emulate the hub content
        const HUB = window.ReportsEngine._HUB || null;
        // Better: directly call hub but it opens modal. Instead inline:
        const cats = Object.create(null);
        // Re-define inline since HUB is closed
        const reports = [
          { id:'executive', cat:'מבט-על', icon:'📊', name:'דשבורד מנהל', desc:'KPI ראשי + תובנות' },
          { id:'diag', cat:'מבט-על', icon:'🩺', name:'אבחון לצמיחה', desc:'המלצות אוטומטיות + ציון בריאות עסק', highlight: true },
          { id:'ltv', cat:'לקוחות', icon:'💰', name:'דירוג LTV', desc:'לקוחות לפי הכנסה כוללת' },
          { id:'inactive', cat:'לקוחות', icon:'⏰', name:'לקוחות לא פעילים', desc:'הזדמנויות לחידוש קשר' },
          { id:'retention', cat:'לקוחות', icon:'🔄', name:'שימור (Retention)', desc:'אחוז שחוזרים אחרי 30/90/180' },
          { id:'noshows', cat:'לקוחות', icon:'❌', name:'No-Show Analysis', desc:'מי לא הגיע + פילוח לפי יום' },
          { id:'pnl', cat:'פיננסי', icon:'💼', name:'רווח והפסד (P&L)', desc:'12 חודשים — מגמה ופירוט' },
          { id:'aging', cat:'פיננסי', icon:'⏳', name:'Aging — גיל החוב', desc:'חובות לפי 30/60/90 ימים' },
          { id:'mix', cat:'פיננסי', icon:'📊', name:'פילוח לפי שירות', desc:'איזה תחום מכניס הכי הרבה' },
          { id:'mrr', cat:'צמיחה', icon:'📈', name:'MRR + YoY', desc:'הכנסה חודשית, צמיחה שנתית' },
          { id:'funnel', cat:'שיווק', icon:'🎯', name:'משפך המרה', desc:'לידים → לקוחות פעילים' },
          { id:'capacity', cat:'תפעול', icon:'📅', name:'ניצולת קלנדר', desc:'אחוז סלוטים שמולאו' },
          { id:'time', cat:'תפעול', icon:'⏰', name:'ניתוח זמן ושיא', desc:'יום ושעה הכי עמוסים' },
          { id:'clinical', cat:'קליני', icon:'🧠', name:'Outcome קליני מצטבר', desc:'שיפור PHQ-9/GAD-7 + שיטות' },
          { id:'content', cat:'SEO', icon:'🔍', name:'בריאות תוכן ו-SEO', desc:'דפים מובילים, traffic, חוסרים' }
        ];
        const groups = {};
        reports.forEach(r => { (groups[r.cat] = groups[r.cat] || []).push(r); });
        document.getElementById('rep-view').innerHTML = Object.entries(groups).map(([cat, items]) => `
          <div style="margin-bottom:2rem">
            <h3 style="color:#1B3A6B;border-bottom:2px solid #C9A84C;padding-bottom:.4rem;margin-bottom:.75rem">${esc(cat)}</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem">
              ${items.map(r => `
                <div onclick="ReportsEngine.open('${r.id}')" style="background:${r.highlight?'linear-gradient(135deg,#fef3c7,#fed7aa)':'#fff'};border:1px solid ${r.highlight?'#C9A84C':'#e5e7eb'};border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .25s">
                  <div style="font-size:2rem;margin-bottom:.5rem">${r.icon}</div>
                  <div style="font-weight:700;color:#1B3A6B;margin-bottom:.25rem">${esc(r.name)}</div>
                  <div style="font-size:.85rem;color:#6b7280">${esc(r.desc)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
      } catch(e) {
        console.error('[reports]', e);
        document.getElementById('reports-section-content').innerHTML = `<div style="background:#fee2e2;padding:1rem;border-radius:8px;color:#991b1b">שגיאה: ${esc(e.message)}</div>`;
      }
    });
  };

  // =====================================================
  // RENDERER: RESOURCES (full page)
  // =====================================================
  renderers.resources = function() {
    setMain(`
      ${sectionHeader('📚 ספריית משאבים', 'קישורים, PDF, וידאו — לשיתוף עם לקוחות')}
      <div id="resources-content"></div>
    `);
    requestAnimationFrame(() => {
      try {
        const Resources = window.CRMExtensions?.Resources;
        if (!Resources) return document.getElementById('resources-content').innerHTML = '<p>טוען...</p>';
        const items = Resources.list();
        const root = document.getElementById('resources-content');
        root.innerHTML = `
          <div style="display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap">
            <button onclick="window.CRMExtensions.Resources.addPrompt()" style="padding:.6rem 1.25rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">+ משאב חדש</button>
            <input type="text" id="res-section-filter" placeholder="🔍 חיפוש..." style="flex:1;min-width:200px;padding:.6rem 1rem;border:1px solid #e5e7eb;border-radius:8px">
          </div>
          <div id="res-section-list"></div>
        `;
        const renderList = (filter) => {
          const filtered = filter ? items.filter(r => (r.title||'').toLowerCase().includes(filter) || (r.tags||[]).some(t => t.toLowerCase().includes(filter))) : items;
          document.getElementById('res-section-list').innerHTML = !filtered.length ? '<p style="text-align:center;color:#6b7280;padding:2rem">📭 הספרייה ריקה</p>' : filtered.map(r => `
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;margin-bottom:.75rem">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:1rem;flex-wrap:wrap">
                <div style="flex:1;min-width:200px">
                  <strong style="color:#1B3A6B;font-size:1.05rem">${({pdf:'📄',video:'🎬',link:'🔗',doc:'📝',audio:'🎵'})[r.type]||'📎'} ${esc(r.title)}</strong>
                  ${r.url ? `<br><a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:#6b7280;font-size:.85rem;word-break:break-all">${esc(r.url.slice(0,80))}${r.url.length>80?'...':''}</a>` : ''}
                  ${r.description ? `<p style="margin:.4rem 0 0;color:#374151">${esc(r.description)}</p>` : ''}
                  ${r.tags?.length ? `<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.5rem">${r.tags.map(t => `<span style="background:#eff4ff;color:#1B3A6B;padding:.15rem .5rem;border-radius:50px;font-size:.75rem">${esc(t)}</span>`).join('')}</div>` : ''}
                </div>
                <div style="display:flex;gap:.4rem">
                  <button onclick="window.CRMExtensions.Resources.shareTo('${r.id}')" title="שתף" aria-label="שתף" style="background:#dcfce7;color:#16a34a;border:0;padding:.4rem .75rem;border-radius:8px;cursor:pointer;font-weight:600">📤 שתף</button>
                  <button onclick="if(confirm('למחוק?')){window.CRMExtensions.Resources.save(window.CRMExtensions.Resources.list().filter(x=>x.id!=='${r.id}'));goto('resources')}" title="מחק" style="background:#fee2e2;color:#dc2626;border:0;padding:.4rem .6rem;border-radius:8px;cursor:pointer">🗑️</button>
                </div>
              </div>
            </div>
          `).join('');
        };
        renderList('');
        document.getElementById('res-section-filter').addEventListener('input', e => renderList(e.target.value.toLowerCase()));
      } catch(e) {
        console.error('[resources]', e);
      }
    });
  };

  // =====================================================
  // RENDERER: AUDIT LOG (full page)
  // =====================================================
  renderers.audit = function() {
    setMain(`
      ${sectionHeader('📋 יומן פעולות', 'כל פעולה רגישה במערכת מתועדת', `
        <button onclick="(window.CRMPlus?.Security?.exportAuditCSV||(()=>{}))()" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">📥 ייצוא CSV</button>
        <button onclick="if(window.CRMPlus?.Security?.clearAudit){window.CRMPlus.Security.clearAudit();goto('audit')}" style="padding:.5rem 1rem;background:#fee2e2;color:#dc2626;border:0;border-radius:8px;cursor:pointer;font-weight:600">🗑️ נקה</button>
      `)}
      <div id="audit-content"></div>
    `);
    requestAnimationFrame(() => {
      const log = (window.CRM ? window.CRM.ls.getJSON('argaman_audit_log',[]) : JSON.parse(localStorage.getItem('argaman_audit_log')||'[]')).slice(-300).reverse();
      const root = document.getElementById('audit-content');
      if (!log.length) {
        root.innerHTML = '<p style="text-align:center;color:#6b7280;padding:3rem">יומן ריק</p>';
        return;
      }
      root.innerHTML = `
        <p style="color:#6b7280;font-size:.9rem;margin-bottom:1rem">מציג 300 פעולות אחרונות (סך הכל: ${(window.CRM ? window.CRM.ls.getJSON('argaman_audit_log',[]) : JSON.parse(localStorage.getItem('argaman_audit_log')||'[]')).length})</p>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <table style="width:100%;font-size:.85rem;border-collapse:collapse">
            <thead><tr style="background:#1B3A6B;color:#fff"><th style="padding:.6rem;text-align:right">זמן</th><th style="padding:.6rem;text-align:right">פעולה</th><th style="padding:.6rem;text-align:right">פרטים</th></tr></thead>
            <tbody>
              ${log.map(e => `
                <tr style="border-bottom:1px solid #f3f4f6">
                  <td style="padding:.5rem;white-space:nowrap;color:#6b7280">${new Date(e.t).toLocaleString('he-IL')}</td>
                  <td style="padding:.5rem"><code style="background:#eff4ff;padding:.15rem .5rem;border-radius:4px;font-size:.8rem">${esc(e.action)}</code></td>
                  <td style="padding:.5rem;color:#6b7280;font-size:.8rem">${esc(JSON.stringify(e.details||{}))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });
  };

  // =====================================================
  // RENDERER: SESSIONS — override to add Calendar tab
  // =====================================================
  const _origSessionsRenderer = renderers.sessions;
  renderers.sessions = function() {
    setMain(`
      ${sectionHeader('📅 פגישות ולוח שנה', 'נהל פגישות ברשימה או בתצוגת קלנדר')}
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:.4rem;margin-bottom:1rem;display:flex;gap:.25rem;width:fit-content">
        <button data-sess-tab="list" class="sess-tab" onclick="window.CRMSections.switchSessionsTab('list')" style="padding:.5rem 1.25rem;border:0;border-radius:8px;cursor:pointer;font-weight:600;background:#1B3A6B;color:#fff">📋 רשימה</button>
        <button data-sess-tab="calendar" class="sess-tab" onclick="window.CRMSections.switchSessionsTab('calendar')" style="padding:.5rem 1.25rem;border:0;border-radius:8px;cursor:pointer;font-weight:600;background:transparent;color:#1B3A6B">🗓️ קלנדר חודשי</button>
        <button data-sess-tab="upcoming" class="sess-tab" onclick="window.CRMSections.switchSessionsTab('upcoming')" style="padding:.5rem 1.25rem;border:0;border-radius:8px;cursor:pointer;font-weight:600;background:transparent;color:#1B3A6B">📆 הבאות בקרוב</button>
      </div>
      <div id="sessions-tabview"></div>
    `);
    requestAnimationFrame(() => window.CRMSections.switchSessionsTab('list'));
  };

  function switchSessionsTab(tab) {
    document.querySelectorAll('[data-sess-tab]').forEach(b => {
      const isActive = b.dataset.sessTab === tab;
      b.style.background = isActive ? '#1B3A6B' : 'transparent';
      b.style.color = isActive ? '#fff' : '#1B3A6B';
    });
    const root = document.getElementById('sessions-tabview');
    if (!root) return;
    if (tab === 'list') {
      // Use original sessions renderer's main content, but inside our container
      if (_origSessionsRenderer) {
        // Save current main, run original, capture, restore
        const main = document.getElementById('main-content');
        const savedHTML = main.innerHTML;
        _origSessionsRenderer();
        const newContent = main.innerHTML;
        main.innerHTML = savedHTML;
        // Extract just the body (not the header)
        const tmp = document.createElement('div');
        tmp.innerHTML = newContent;
        const sessionsBody = tmp.querySelector('#sessions-view, .sessions-list-container, .sessions-main') || tmp;
        // Inject everything except section-header from original
        const origHeader = tmp.querySelector('.section-header');
        if (origHeader) origHeader.remove();
        root.innerHTML = tmp.innerHTML;
        // Re-run any init logic
        try { if (typeof renderSessionsView === 'function') renderSessionsView('list'); } catch(e){}
      }
    } else if (tab === 'calendar') {
      root.innerHTML = '<div id="cal-section-root"></div>';
      try {
        if (window.ClinicalSuite?.CalendarView?.render) {
          window.ClinicalSuite.CalendarView.render('cal-section-root');
        } else {
          root.innerHTML = '<p style="text-align:center;padding:2rem;color:#6b7280">לוח השנה לא זמין כרגע</p>';
        }
      } catch(e) {
        console.error('[calendar-tab]', e);
      }
    } else if (tab === 'upcoming') {
      const sessions = (State.sessions||[]).filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date()).sort((a,b) => (a.date+' '+a.time).localeCompare(b.date+' '+b.time)).slice(0,30);
      const clients = State.clients||[];
      if (!sessions.length) {
        root.innerHTML = '<div style="text-align:center;padding:3rem;color:#6b7280"><div style="font-size:3rem;opacity:.4">📆</div><p>אין פגישות עתידיות מתוכננות</p></div>';
        return;
      }
      // Group by date
      const byDate = {};
      sessions.forEach(s => { (byDate[s.date] = byDate[s.date]||[]).push(s); });
      root.innerHTML = Object.entries(byDate).map(([date, list]) => {
        const d = new Date(date);
        const dayName = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][d.getDay()];
        return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;margin-bottom:.75rem">
          <h3 style="color:#1B3A6B;margin-bottom:.75rem;border-bottom:2px solid #C9A84C;padding-bottom:.3rem">${dayName}, ${d.toLocaleDateString('he-IL')}</h3>
          ${list.map(s => {
            const c = clients.find(x => x.id === s.clientId) || {};
            return `<div style="padding:.5rem;background:#f9fafb;border-radius:8px;margin-bottom:.4rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
              <div><strong>${esc(s.time||'')}</strong> · ${esc(c.name||'(לקוח)')}</div>
              <div>
                ${typeof editSession === 'function' ? `<button class="btn-icon" onclick="editSession('${s.id}')" style="background:#eff4ff;color:#1B3A6B;border:0;padding:.3rem .6rem;border-radius:6px;cursor:pointer">✏</button>` : ''}
                ${typeof openSessionNotes === 'function' ? `<button class="btn-icon" onclick="openSessionNotes('${s.id}')" style="background:${s.notesData?.savedAt?'#dbeafe':'#f3f4f6'};color:#1B3A6B;border:0;padding:.3rem .6rem;border-radius:6px;cursor:pointer">📔</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>`;
      }).join('');
    }
  }

  // =====================================================
  // RENDERER: SETTINGS — consolidated hub
  // =====================================================
  const _origSettingsRenderer = renderers.settings;
  renderers.settings = function() {
    setMain(`
      ${sectionHeader('⚙️ הגדרות', 'התאמה אישית של המערכת')}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem">

        <div class="setting-card" onclick="if(window.openColorThemes)openColorThemes()" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">🎨</div>
          <strong style="color:#1B3A6B">ערכת צבעים</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">בחר אחת מ-6 ערכות צבעים לממשק</p>
        </div>

        <div class="setting-card" onclick="if(window.openSetup2FA){const en=window.CRMPlus?.Security?.is2FAEnabled?.();(en?window.openDisable2FA():window.openSetup2FA())}" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">🔐</div>
          <strong style="color:#1B3A6B">אימות דו-שלבי (2FA)</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">Google Authenticator / Authy עם TOTP</p>
        </div>

        <div class="setting-card" onclick="if(window.openBackup)openBackup()" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">💾</div>
          <strong style="color:#1B3A6B">גיבוי מלא</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">ייצוא JSON של כל הנתונים</p>
        </div>

        <div class="setting-card" onclick="if(window.openImport)openImport()" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">📥</div>
          <strong style="color:#1B3A6B">ייבוא נתונים</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">שחזור מקובץ גיבוי</p>
        </div>

        <div class="setting-card" onclick="if(window.openICalExport)openICalExport()" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">📤</div>
          <strong style="color:#1B3A6B">ייצוא ל-Google/Apple Calendar</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">קובץ .ics עם כל הפגישות</p>
        </div>

        <div class="setting-card" onclick="goto('audit')" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">📋</div>
          <strong style="color:#1B3A6B">יומן פעולות</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">היסטוריית פעולות רגישות</p>
        </div>

        <div class="setting-card" onclick="if(window.openHotkeysHelp)openHotkeysHelp()" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">⌨️</div>
          <strong style="color:#1B3A6B">קיצורי דרך</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">מקשי קיצור למהירות</p>
        </div>

        <div class="setting-card" onclick="if(window.openTimerSummary)openTimerSummary()" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s">
          <div style="font-size:2rem;margin-bottom:.5rem">⏱</div>
          <strong style="color:#1B3A6B">סיכום זמני עבודה</strong>
          <p style="color:#6b7280;font-size:.85rem;margin-top:.25rem">היסטוריית שעון העבודה</p>
        </div>

      </div>

      <style>.setting-card:hover{border-color:#1B3A6B!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)}</style>

      ${_origSettingsRenderer ? '<div id="settings-original" style="margin-top:2rem"></div>' : ''}
    `);
    // If there was an original settings renderer with security/password etc, render it below
    if (_origSettingsRenderer) {
      const tmp = document.createElement('div');
      const main = document.getElementById('main-content');
      const saved = main.innerHTML;
      // Capture original content
      _origSettingsRenderer();
      const origContent = main.innerHTML;
      main.innerHTML = saved;
      // Try to extract just the meaningful body (not the title)
      tmp.innerHTML = origContent;
      const header = tmp.querySelector('.section-header, h1');
      if (header) header.remove();
      const target = document.getElementById('settings-original');
      if (target && tmp.innerHTML.trim()) {
        target.innerHTML = '<h2 style="color:#1B3A6B;border-bottom:2px solid #C9A84C;padding-bottom:.4rem;margin-bottom:1rem">🔒 אבטחת חשבון</h2>' + tmp.innerHTML;
      }
    }
  };

  // =====================================================
  // PUBLIC INTERFACE
  // =====================================================
  window.CRMSections = {
    switchSessionsTab,
    init() {
      console.log('[CRMSections] ✓ section renderers added');
    }
  };
  window.CRMSections.init();

  } // end start()
})();
