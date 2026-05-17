/* =====================================================
   crm-polish.js — Final Polish Modules
   קליניקת ארגמן · פולישים אחרונים
   ─────────────────────────────────────────────────────
   Modules:
   1. SmartScheduler — propose 3 open slots for a client
   2. WhatIfCalculator — business simulations
   3. StickyNotes — persistent dashboard notes
   4. Pomodoro — focus timer
   5. ColorThemes — color customization (NOT logo/name)
   ===================================================== */
(function(){
  'use strict';

  function waitForState(attempts) {
    if (typeof State !== 'undefined') return start();
    if (attempts > 60) return console.warn('[CRMPolish] State never appeared');
    setTimeout(() => waitForState(attempts+1), 250);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForState(0));
  } else {
    waitForState(0);
  }

  function start(){

  const $ = (s,r) => (r||document).querySelector(s);
  const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
  const esc = s => String(s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
  const todayISO = () => new Date().toISOString().slice(0,10);
  const nowISO = () => new Date().toISOString();
  const ils = n => '₪' + Math.round(Number(n||0)).toLocaleString('he-IL');
  const pct = n => Math.round(n*100) + '%';
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('he-IL'); } catch { return d; } };

  function getModal() {
    if (typeof openModal === 'function') return openModal;
    if (typeof modal === 'function') return (t,c,o) => modal(c, Object.assign({ title:t, size:'lg' }, o||{}));
    return (t,h) => alert(t);
  }
  function showToast(msg, type) { if (typeof toast === 'function') return toast(msg, type||'success'); console.log('[Polish]', msg); }
  function closeM() { if (typeof closeModal === 'function') return closeModal(); document.querySelectorAll('.modal-bg').forEach(m => m.remove()); }
  function audit(action, details) {
    if (window.CRMPlus?.Security?.log) return window.CRMPlus.Security.log(action, details);
  }

  // =====================================================
  // MODULE 1: SMART SCHEDULER
  // =====================================================
  const SmartScheduler = {
    // Default working hours: Sun-Thu 9-21, Fri 9-13, Sat closed
    DEFAULT_HOURS: {
      0: { start: 9, end: 21 },  // Sun
      1: { start: 9, end: 21 },
      2: { start: 9, end: 21 },
      3: { start: 9, end: 21 },
      4: { start: 9, end: 21 },
      5: { start: 9, end: 13 },  // Fri
      6: null                     // Sat
    },
    SLOT_DURATION_MIN: 60,
    BUFFER_MIN: 15,

    open(clientId) {
      const c = clientId ? (State.clients||[]).find(x => x.id === clientId) : null;
      const slots = this.findOpenSlots(7); // next 7 days
      const html = `
        <p>${c ? `מציע פגישות חדשות עבור <strong>${esc(c.name||'')}</strong>` : 'חלונות פנויים ב-7 הימים הקרובים'}</p>
        <p style="font-size:.85rem;color:#6b7280">מבוסס על: א׳-ה׳ 9:00-21:00, ו׳ 9:00-13:00, פגישה 60 דק׳ + 15 דק׳ חיץ</p>

        <div style="margin:1rem 0">
          <label style="font-weight:600">בחר ימים</label>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.4rem">
            ${[0,1,2,3,4,5].map(d => `
              <label style="display:inline-flex;align-items:center;gap:.25rem;padding:.3rem .6rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.85rem">
                <input type="checkbox" data-day="${d}" checked style="margin:0">
                ${['א׳','ב׳','ג׳','ד׳','ה׳','ו׳'][d]}
              </label>
            `).join('')}
          </div>
        </div>

        <div style="margin:1rem 0">
          <label style="font-weight:600">העדפת זמן</label>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.4rem">
            <label style="padding:.3rem .6rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.85rem"><input type="radio" name="pref" value="morning" style="margin-left:.25rem">🌅 בוקר (9-12)</label>
            <label style="padding:.3rem .6rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.85rem"><input type="radio" name="pref" value="noon" style="margin-left:.25rem">☀️ צהריים (12-16)</label>
            <label style="padding:.3rem .6rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.85rem"><input type="radio" name="pref" value="evening" checked style="margin-left:.25rem">🌆 ערב (16-21)</label>
            <label style="padding:.3rem .6rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.85rem"><input type="radio" name="pref" value="any" style="margin-left:.25rem">⚡ כל זמן</label>
          </div>
        </div>

        <button onclick="window.CRMPolish.SmartScheduler.refresh('${clientId||''}')" style="background:#1B3A6B;color:#fff;border:0;padding:.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;margin-bottom:1rem">🔄 רענן הצעות</button>

        <div id="slots-output">${this._renderSlots(slots, clientId)}</div>
      `;
      getModal()('📅 הצע פגישות חכמות', html, { size:'lg' });
    },

    refresh(clientId) {
      const selectedDays = $$('input[data-day]:checked').map(el => parseInt(el.dataset.day));
      const pref = $('input[name="pref"]:checked')?.value || 'any';
      const slots = this.findOpenSlots(14, { days: selectedDays, pref });
      $('#slots-output').innerHTML = this._renderSlots(slots, clientId);
    },

    _renderSlots(slots, clientId) {
      if (!slots.length) return '<p style="color:#6b7280;text-align:center;padding:2rem">אין חלונות פנויים בקריטריונים אלה — נסה להרחיב</p>';
      // Group by day
      const byDay = {};
      slots.forEach(s => { (byDay[s.date] = byDay[s.date] || []).push(s); });
      return `<div style="display:flex;flex-direction:column;gap:.5rem">
        ${Object.entries(byDay).slice(0, 10).map(([date, daySlots]) => `
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:.75rem">
            <strong style="color:#1B3A6B">${this._dayName(date)} ${fmtDate(date)}</strong>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem">
              ${daySlots.map(s => `
                <button onclick="window.CRMPolish.SmartScheduler.pickSlot('${s.date}','${s.time}','${clientId||''}')" style="padding:.4rem .9rem;background:#eff4ff;color:#1B3A6B;border:1px solid #1B3A6B;border-radius:50px;cursor:pointer;font-weight:600;font-size:.85rem;transition:all .2s">${s.time}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      ${clientId ? `<p style="margin-top:1rem;font-size:.85rem;color:#6b7280">💡 לחץ על שעה כדי לקבוע פגישה אוטומטית</p>` : '<p style="margin-top:1rem;font-size:.85rem;color:#6b7280">פתח לקוח כדי לקבוע פגישה</p>'}`;
    },

    _dayName(dateISO) {
      return ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][new Date(dateISO).getDay()];
    },

    findOpenSlots(daysAhead, opts) {
      opts = opts || {};
      const slots = [];
      const sessions = State.sessions || [];
      const now = new Date();
      now.setHours(0,0,0,0);
      const allowedDays = opts.days || [0,1,2,3,4,5];
      const pref = opts.pref || 'any';

      for (let d = 0; d < daysAhead; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const dow = date.getDay();
        if (!allowedDays.includes(dow)) continue;
        const hours = this.DEFAULT_HOURS[dow];
        if (!hours) continue;

        const dateISO = date.toISOString().slice(0,10);
        const daySess = sessions.filter(s => s.date === dateISO && s.status !== 'cancelled');
        const occupied = daySess.map(s => {
          const [h, m] = (s.time || '12:00').split(':').map(Number);
          const start = h * 60 + m;
          return [start, start + this.SLOT_DURATION_MIN + this.BUFFER_MIN];
        });

        // Filter time range by preference
        let startH = hours.start, endH = hours.end;
        if (pref === 'morning') endH = Math.min(endH, 12);
        else if (pref === 'noon') { startH = Math.max(startH, 12); endH = Math.min(endH, 16); }
        else if (pref === 'evening') startH = Math.max(startH, 16);

        // Generate hourly slots
        for (let h = startH; h < endH; h++) {
          const slotStart = h * 60;
          const slotEnd = slotStart + this.SLOT_DURATION_MIN;
          // Check if conflicts with any occupied range
          const conflict = occupied.some(([s, e]) => (slotStart < e && slotEnd + this.BUFFER_MIN > s));
          if (!conflict) {
            // Don't suggest past hours for today
            if (d === 0 && new Date().getHours() >= h) continue;
            slots.push({ date: dateISO, time: `${String(h).padStart(2,'0')}:00` });
          }
        }
      }
      return slots;
    },

    pickSlot(date, time, clientId) {
      if (!clientId) {
        showToast('בחר לקוח קודם','error');
        return;
      }
      if (!confirm(`לקבוע פגישה ב-${fmtDate(date)} בשעה ${time}?`)) return;
      const newSess = {
        id: uid(),
        clientId,
        date,
        time,
        status: 'scheduled',
        notes: '',
        createdAt: nowISO()
      };
      State.sessions.push(newSess);
      if (typeof save === 'function' && typeof LS !== 'undefined') save(LS.sessions, State.sessions);
      audit('smart_scheduled', { clientId, date, time });
      closeM();
      showToast(`✓ פגישה נקבעה ל-${fmtDate(date)} ${time}`);
      if (typeof renderSessionsView === 'function') try { renderSessionsView('list'); } catch(e){}
    }
  };

  // =====================================================
  // MODULE 2: WHAT-IF CALCULATOR
  // =====================================================
  const WhatIf = {
    open() {
      const sessions = State.sessions || [];
      const clients = State.clients || [];
      const paid = sessions.filter(s => s.paid && s.price);

      const now = new Date();
      const last12mo = paid.filter(s => {
        const d = new Date(s.date);
        return (now - d) <= 1000*60*60*24*365;
      });
      const totalRev = last12mo.reduce((sum,s) => sum + Number(s.price), 0);
      const avgPrice = last12mo.length ? totalRev / last12mo.length : 350;
      const sessionsPerWeek = last12mo.length / 52;
      const activeClients = clients.filter(c => c.status === 'active').length;

      const html = `
        <p style="background:#f3f4f6;padding:.75rem;border-radius:8px"><strong>בסיס נוכחי (12 חודשים אחרונים):</strong><br>
        הכנסות: <strong style="color:#1B3A6B">${ils(totalRev)}</strong> · ממוצע פגישה: <strong>${ils(avgPrice)}</strong> · ${sessionsPerWeek.toFixed(1)} פגישות בשבוע</p>

        <h3 style="color:#1B3A6B;margin-top:1.5rem">🎚 שינויים מוצעים</h3>
        <div style="display:flex;flex-direction:column;gap:1rem;margin:1rem 0">
          <div>
            <label style="font-weight:600;display:flex;justify-content:space-between">
              <span>📈 עליית מחיר</span>
              <span id="wi-price-pct" style="color:#1B3A6B">+0%</span>
            </label>
            <input type="range" id="wi-price" min="0" max="40" value="0" step="5" style="width:100%" oninput="window.CRMPolish.WhatIf.calc()">
          </div>
          <div>
            <label style="font-weight:600;display:flex;justify-content:space-between">
              <span>👥 פגישות נוספות בשבוע</span>
              <span id="wi-sess-val" style="color:#1B3A6B">+0</span>
            </label>
            <input type="range" id="wi-sess" min="0" max="10" value="0" step="1" style="width:100%" oninput="window.CRMPolish.WhatIf.calc()">
          </div>
          <div>
            <label style="font-weight:600;display:flex;justify-content:space-between">
              <span>📉 שיפור No-Show (אחוז ירידה)</span>
              <span id="wi-ns-val" style="color:#1B3A6B">0%</span>
            </label>
            <input type="range" id="wi-ns" min="0" max="50" value="0" step="5" style="width:100%" oninput="window.CRMPolish.WhatIf.calc()">
          </div>
          <div>
            <label style="font-weight:600;display:flex;justify-content:space-between">
              <span>🔄 שיפור שימור (אחוז יותר חוזרים)</span>
              <span id="wi-ret-val" style="color:#1B3A6B">0%</span>
            </label>
            <input type="range" id="wi-ret" min="0" max="30" value="0" step="5" style="width:100%" oninput="window.CRMPolish.WhatIf.calc()">
          </div>
        </div>

        <div id="wi-result" style="background:linear-gradient(135deg,#1B3A6B,#2C5F8B);color:#fff;padding:1.5rem;border-radius:14px;margin-top:1rem">
          <h3 style="color:#fff;margin-bottom:.5rem">📊 תחזית שנתית</h3>
          <div id="wi-numbers"></div>
        </div>

        <div id="wi-recommendations" style="margin-top:1rem"></div>
      `;
      getModal()('🧮 סימולציה עסקית — What If?', html, { size:'lg' });
      // Store baseline
      this._baseline = { totalRev, avgPrice, sessionsPerWeek, activeClients };
      this.calc();
    },

    calc() {
      const b = this._baseline;
      const pricePct = parseInt($('#wi-price').value) / 100;
      const extraSess = parseInt($('#wi-sess').value);
      const nsImprove = parseInt($('#wi-ns').value) / 100;
      const retImprove = parseInt($('#wi-ret').value) / 100;

      // Update labels
      $('#wi-price-pct').textContent = `+${(pricePct*100).toFixed(0)}%`;
      $('#wi-sess-val').textContent = `+${extraSess}/שבוע`;
      $('#wi-ns-val').textContent = `-${(nsImprove*100).toFixed(0)}%`;
      $('#wi-ret-val').textContent = `+${(retImprove*100).toFixed(0)}%`;

      // Calculate
      const newAvgPrice = b.avgPrice * (1 + pricePct);
      const newSessPerWeek = b.sessionsPerWeek + extraSess;
      const sessYr = newSessPerWeek * 52;
      // Retention boost = clients stay longer = more sessions
      const retBoost = 1 + retImprove;
      // No-show recovery = sessions that would have been no-shows now happen
      const nsBoost = 1 + (nsImprove * 0.1); // ~10% of baseline are no-shows
      const projectedRev = sessYr * newAvgPrice * retBoost * nsBoost;
      const diff = projectedRev - b.totalRev;
      const diffPct = b.totalRev ? (diff / b.totalRev) : 0;

      $('#wi-numbers').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin-top:.5rem">
          <div><div style="font-size:.75rem;opacity:.8">הכנסה שנתית</div><div style="font-size:1.6rem;font-weight:800">${ils(projectedRev)}</div></div>
          <div><div style="font-size:.75rem;opacity:.8">שינוי</div><div style="font-size:1.6rem;font-weight:800;color:${diff>=0?'#fde68a':'#fecaca'}">${diff>=0?'▲':'▼'} ${ils(Math.abs(diff))}</div></div>
          <div><div style="font-size:.75rem;opacity:.8">צמיחה</div><div style="font-size:1.6rem;font-weight:800;color:${diff>=0?'#fde68a':'#fecaca'}">${diffPct>=0?'+':''}${pct(diffPct)}</div></div>
          <div><div style="font-size:.75rem;opacity:.8">פגישות/שנה</div><div style="font-size:1.6rem;font-weight:800">${Math.round(sessYr)}</div></div>
        </div>
      `;

      // Smart recommendations
      const recs = [];
      if (extraSess > 5) recs.push({ type:'warn', text:'⚠️ +5 פגישות/שבוע = שחיקה. שווה לחשוב על עזר מנהלי / שותף' });
      if (pricePct > 0.15) recs.push({ type:'warn', text:'⚠️ עליית מחיר של 15%+ — דורשת תקשור ערך מאוד ברור ללקוחות קיימים' });
      if (pricePct === 0 && extraSess === 0 && nsImprove === 0 && retImprove === 0) {
        recs.push({ type:'info', text:'💡 גרור את הסליידרים למעלה כדי לראות תרחישים' });
      }
      if (diff > 50000) recs.push({ type:'good', text:`🎯 שיפור של ${ils(diff)} = אפשר להעלות סטנדרט חיים משמעותית` });
      if (nsImprove > 0.2) recs.push({ type:'good', text:`✓ שיפור no-show 20%+ — תזכורות 24h SMS/WA הכרחיות` });
      if (retImprove > 0.15) recs.push({ type:'good', text:`✓ שימור 15%+ = ROI הכי גבוה (לקוח חוזר = פי 5 רווחי)` });

      $('#wi-recommendations').innerHTML = recs.length ? recs.map(r => `
        <div style="background:${r.type==='good'?'#dcfce7':r.type==='warn'?'#fef3c7':'#eff4ff'};border-right:4px solid ${r.type==='good'?'#16a34a':r.type==='warn'?'#f59e0b':'#1B3A6B'};padding:.6rem;border-radius:6px;margin-bottom:.4rem;font-size:.9rem">${esc(r.text)}</div>
      `).join('') : '';
    }
  };

  // =====================================================
  // MODULE 3: STICKY NOTES
  // =====================================================
  const StickyNotes = {
    LS: 'argaman_sticky_notes',
    list() { try { return JSON.parse(localStorage.getItem(this.LS)) || []; } catch { return []; } },
    save(notes) { localStorage.setItem(this.LS, JSON.stringify(notes)); },

    open() {
      const notes = this.list();
      const colors = ['#fef3c7','#fce7f3','#dbeafe','#dcfce7','#fed7aa','#e9d5ff'];
      const html = `
        <p>פתקיות מהירות לעצמך — שמורות אוטומטית.</p>
        <button onclick="window.CRMPolish.StickyNotes.add()" style="background:#1B3A6B;color:#fff;border:0;padding:.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;margin:1rem 0">+ פתקית חדשה</button>
        <div id="sticky-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem">
          ${notes.length ? notes.map((n,i) => `
            <div style="background:${colors[i % colors.length]};padding:1rem;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.05);position:relative">
              <textarea onchange="window.CRMPolish.StickyNotes.update('${n.id}',this.value)" style="background:transparent;border:0;width:100%;min-height:80px;font-family:inherit;font-size:.9rem;resize:vertical">${esc(n.text)}</textarea>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.4rem;font-size:.7rem;color:#6b7280">
                <span>${fmtDate(n.createdAt)}</span>
                <button onclick="window.CRMPolish.StickyNotes.del('${n.id}')" style="background:transparent;border:0;cursor:pointer;color:#6b7280;font-size:1rem">🗑️</button>
              </div>
            </div>
          `).join('') : '<p style="color:#6b7280;text-align:center;padding:2rem">אין פתקיות עדיין. הוסף ראשונה!</p>'}
        </div>
      `;
      getModal()('📌 פתקיות (' + notes.length + ')', html, { size:'lg' });
    },

    add() {
      const notes = this.list();
      notes.unshift({ id: uid(), text: '', createdAt: nowISO() });
      this.save(notes);
      this.open();
    },

    update(id, text) {
      const notes = this.list();
      const n = notes.find(x => x.id === id);
      if (!n) return;
      n.text = text;
      n.updatedAt = nowISO();
      this.save(notes);
    },

    del(id) {
      if (!confirm('למחוק פתקית?')) return;
      this.save(this.list().filter(n => n.id !== id));
      this.open();
    }
  };

  // =====================================================
  // MODULE 4: POMODORO TIMER
  // =====================================================
  const Pomodoro = {
    LS: 'argaman_pomodoro_count',
    workMin: 25, breakMin: 5,
    state: { running: false, mode: 'work', startedAt: null, paused: 0 },
    intervalId: null,

    open() {
      const count = parseInt(localStorage.getItem(this.LS) || '0');
      const html = `
        <div style="text-align:center;padding:2rem 1rem">
          <div id="pomo-display" style="font-size:5rem;font-weight:800;color:#1B3A6B;font-family:monospace;line-height:1">25:00</div>
          <div id="pomo-mode" style="color:#6b7280;font-size:1.1rem;margin-bottom:1rem">מצב: 🎯 עבודה (25 דק׳)</div>
          <div style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap">
            <button id="pomo-start-btn" onclick="window.CRMPolish.Pomodoro.toggle()" style="background:#16a34a;color:#fff;border:0;padding:.75rem 2rem;border-radius:50px;cursor:pointer;font-weight:700;font-size:1rem">▶ התחל</button>
            <button onclick="window.CRMPolish.Pomodoro.reset()" style="background:#f3f4f6;color:#374151;border:0;padding:.75rem 1.5rem;border-radius:50px;cursor:pointer;font-weight:600">🔄 איפוס</button>
          </div>
          <div style="margin-top:1.5rem;font-size:.9rem;color:#6b7280">
            🍅 השלמת היום: <strong style="color:#1B3A6B">${count}</strong> פומודורים
          </div>
        </div>
        <div style="margin-top:1rem;font-size:.85rem;color:#6b7280;background:#f9fafb;padding:.75rem;border-radius:8px">
          <strong>שיטת פומודורו:</strong><br>
          ⏱ 25 דקות עבודה ממוקדת → 5 דקות הפסקה → חזרה לעבודה. אחרי 4 פומודורים — הפסקה ארוכה (15 דק׳).
        </div>
      `;
      getModal()('🍅 פומודורו', html, { size:'md' });
      this._updateDisplay();
    },

    toggle() {
      if (this.state.running) {
        this.pause();
      } else {
        this.start();
      }
    },

    start() {
      if (!this.state.startedAt) {
        this.state.startedAt = Date.now();
        this.state.paused = 0;
      } else {
        // Resume from pause
        this.state.startedAt = Date.now() - this.state.paused;
      }
      this.state.running = true;
      $('#pomo-start-btn').textContent = '⏸ השהה';
      $('#pomo-start-btn').style.background = '#f59e0b';
      this.intervalId = setInterval(() => this._tick(), 500);
    },

    pause() {
      this.state.running = false;
      this.state.paused = Date.now() - this.state.startedAt;
      clearInterval(this.intervalId);
      const btn = $('#pomo-start-btn');
      if (btn) {
        btn.textContent = '▶ המשך';
        btn.style.background = '#16a34a';
      }
    },

    reset() {
      this.state = { running: false, mode: 'work', startedAt: null, paused: 0 };
      clearInterval(this.intervalId);
      this._updateDisplay();
      const btn = $('#pomo-start-btn');
      if (btn) {
        btn.textContent = '▶ התחל';
        btn.style.background = '#16a34a';
      }
    },

    _tick() {
      const totalMs = (this.state.mode === 'work' ? this.workMin : this.breakMin) * 60 * 1000;
      const elapsed = Date.now() - this.state.startedAt;
      const remaining = totalMs - elapsed;
      if (remaining <= 0) {
        this._complete();
        return;
      }
      this._updateDisplay(remaining);
    },

    _updateDisplay(remainingMs) {
      const display = $('#pomo-display');
      const modeEl = $('#pomo-mode');
      if (!display) return;
      const ms = remainingMs !== undefined ? remainingMs : (this.state.mode === 'work' ? this.workMin : this.breakMin) * 60 * 1000;
      const sec = Math.ceil(ms / 1000);
      const min = Math.floor(sec / 60);
      const s = sec % 60;
      display.textContent = `${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (modeEl) modeEl.textContent = `מצב: ${this.state.mode === 'work' ? '🎯 עבודה' : '☕ הפסקה'} (${this.state.mode === 'work' ? this.workMin : this.breakMin} דק׳)`;
    },

    _complete() {
      clearInterval(this.intervalId);
      // Beep
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 200);
      } catch(e){}
      if (this.state.mode === 'work') {
        const count = parseInt(localStorage.getItem(this.LS) || '0') + 1;
        localStorage.setItem(this.LS, String(count));
        showToast('🍅 פומודורו הושלם! זמן הפסקה');
        this.state.mode = 'break';
      } else {
        showToast('☕ הפסקה הסתיימה — חזרה לעבודה');
        this.state.mode = 'work';
      }
      this.state.running = false;
      this.state.startedAt = null;
      this.state.paused = 0;
      this._updateDisplay();
      const btn = $('#pomo-start-btn');
      if (btn) {
        btn.textContent = '▶ התחל ' + (this.state.mode === 'work' ? 'עבודה' : 'הפסקה');
        btn.style.background = '#16a34a';
      }
    }
  };

  // =====================================================
  // MODULE 5: COLOR THEMES (colors only — NOT logo/name)
  // =====================================================
  const ColorThemes = {
    LS: 'argaman_theme',

    themes: {
      classic: { name: 'קלאסי (ברירת מחדל)', primary: '#1B3A6B', accent: '#C9A84C', preview: ['#1B3A6B','#C9A84C'] },
      forest:  { name: '🌲 יער', primary: '#2d6a4f', accent: '#d4a373', preview: ['#2d6a4f','#d4a373'] },
      sunset:  { name: '🌅 שקיעה', primary: '#7c2d12', accent: '#fbbf24', preview: ['#7c2d12','#fbbf24'] },
      ocean:   { name: '🌊 אוקיינוס', primary: '#0c4a6e', accent: '#06b6d4', preview: ['#0c4a6e','#06b6d4'] },
      lavender:{ name: '💜 לבנדר', primary: '#5b21b6', accent: '#f9a8d4', preview: ['#5b21b6','#f9a8d4'] },
      mono:    { name: '⚫ מינימליסטי', primary: '#1f2937', accent: '#9ca3af', preview: ['#1f2937','#9ca3af'] }
    },

    current() {
      try { return JSON.parse(localStorage.getItem(this.LS)) || this.themes.classic; }
      catch { return this.themes.classic; }
    },

    apply(theme) {
      const root = document.documentElement;
      root.style.setProperty('--navy', theme.primary);
      root.style.setProperty('--navy-dark', this._darken(theme.primary, 0.15));
      root.style.setProperty('--navy-mid', this._darken(theme.primary, 0.05));
      root.style.setProperty('--gold', theme.accent);
      root.style.setProperty('--gold-dark', this._darken(theme.accent, 0.15));
      localStorage.setItem(this.LS, JSON.stringify(theme));
      audit('theme_changed', { primary: theme.primary });
    },

    open() {
      const current = this.current();
      const html = `
        <p>בחר ערכת צבעים ל-CRM (לא משפיע על האתר הציבורי או על הלוגו):</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem;margin:1rem 0">
          ${Object.entries(this.themes).map(([k,t]) => `
            <button onclick="window.CRMPolish.ColorThemes.select('${k}')" style="background:#fff;border:2px solid ${t.primary===current.primary?t.primary:'#e5e7eb'};border-radius:12px;padding:1rem;cursor:pointer;text-align:right;font-family:inherit;transition:all .2s">
              <div style="display:flex;gap:.4rem;margin-bottom:.5rem">
                <div style="width:30px;height:30px;border-radius:6px;background:${t.primary}"></div>
                <div style="width:30px;height:30px;border-radius:6px;background:${t.accent}"></div>
              </div>
              <strong style="color:${t.primary}">${esc(t.name)}</strong>
              ${t.primary === current.primary ? '<div style="color:#16a34a;font-size:.8rem;margin-top:.25rem">✓ פעיל</div>' : ''}
            </button>
          `).join('')}
        </div>
        <p style="font-size:.85rem;color:#6b7280">⚠️ הגדרות הצבע מוחלות מקומית בלבד (במחשב/דפדפן זה). לא משפיע על האתר הציבורי או על הלוגו.</p>
      `;
      getModal()('🎨 ערכות צבעים', html, { size:'md' });
    },

    select(key) {
      const t = this.themes[key];
      if (!t) return;
      this.apply(t);
      showToast(`✓ הוחל: ${t.name}`);
      closeM();
      // Reload to ensure all components pick up new colors
      setTimeout(() => location.reload(), 800);
    },

    _darken(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
      r = Math.max(0, Math.floor(r * (1-amt)));
      g = Math.max(0, Math.floor(g * (1-amt)));
      b = Math.max(0, Math.floor(b * (1-amt)));
      return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
    },

    init() {
      // Apply saved theme on load
      const t = this.current();
      if (t.primary !== this.themes.classic.primary) this.apply(t);
    }
  };

  // =====================================================
  // PUBLIC INTERFACE
  // =====================================================
  window.CRMPolish = {
    SmartScheduler, WhatIf, StickyNotes, Pomodoro, ColorThemes,
    closeM,
    init() {
      window.openSmartScheduler = (id) => SmartScheduler.open(id);
      window.openWhatIf = () => WhatIf.open();
      window.openStickyNotes = () => StickyNotes.open();
      window.openPomodoro = () => Pomodoro.open();
      window.openColorThemes = () => ColorThemes.open();
      ColorThemes.init();
      console.log('[CRMPolish] ✓ 5 modules loaded');
    }
  };
  window.CRMPolish.init();

  } // end start
})();
