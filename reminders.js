/* =====================================================
   reminders.js — Personal reminders for the owner
   Stored in State.reminders (synced via cloud).
   ===================================================== */
(function(){
  'use strict';
  const LS_KEY = 'argaman_reminders';

  function init(){
    if (!window.State) return;
    if (!Array.isArray(window.State.reminders)) {
      window.State.reminders = window.load ? (window.load(LS_KEY, [])) : [];
    }
  }

  function addReminder(text, dateISO){
    init();
    const reminder = {
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      text: String(text).trim(),
      dueDate: dateISO,
      createdAt: new Date().toISOString(),
      done: false
    };
    window.State.reminders.unshift(reminder);
    if (window.save && window.LS) window.save(LS_KEY, window.State.reminders);
    return reminder;
  }

  function deleteReminder(id){
    init();
    window.State.reminders = window.State.reminders.filter(r => r.id !== id);
    if (window.save && window.LS) window.save(LS_KEY, window.State.reminders);
  }

  function toggleDone(id){
    init();
    const r = window.State.reminders.find(x => x.id === id);
    if (r){
      r.done = !r.done;
      r.completedAt = r.done ? new Date().toISOString() : null;
      if (window.save && window.LS) window.save(LS_KEY, window.State.reminders);
    }
  }

  function getDue(){
    init();
    const today = new Date().toISOString().slice(0,10);
    return (window.State.reminders || []).filter(r => !r.done && r.dueDate && r.dueDate <= today);
  }

  function getAll(){
    init();
    return (window.State.reminders || []).slice().sort((a,b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.dueDate||'').localeCompare(b.dueDate||'');
    });
  }

  function renderRemindersWidget(){
    const due = getDue();
    if (due.length === 0) return '';
    return `
      <div class="card" style="background:#fef3c7;border-right:4px solid #f59e0b;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
          <h3 style="color:#92400e;display:flex;align-items:center;gap:.5rem">⏰ תזכורות אישיות (${due.length})</h3>
          <button class="btn" onclick="window.openRemindersModal()" style="font-size:.8rem;padding:.3rem .7rem">ניהול</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:.4rem">
          ${due.map(r => `
            <div style="background:#fff;border-radius:6px;padding:.5rem .7rem;display:flex;justify-content:space-between;align-items:center;gap:.5rem">
              <span><input type="checkbox" onchange="window.markReminderDone('${r.id}')" style="margin-left:.5rem"> ${escapeHtml(r.text)}</span>
              <span style="color:#9ca3af;font-size:.75rem">${r.dueDate}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.markReminderDone = function(id){
    toggleDone(id);
    if (window.toast) window.toast('✓ סומן כבוצע','success');
    if (window.renderers && window.currentSection) {
      try { window.renderers[window.currentSection](); } catch(_){}
    }
  };

  window.openRemindersModal = function(){
    const all = getAll();
    const today = new Date().toISOString().slice(0,10);
    const html = `
      <div class="modal-content" style="max-width:600px">
        <h2 style="color:var(--navy);margin-bottom:1rem">⏰ תזכורות אישיות</h2>
        <div style="background:#f9fafb;padding:.75rem;border-radius:6px;margin-bottom:1rem">
          <div style="display:grid;grid-template-columns:1fr auto auto;gap:.5rem">
            <input id="rem-text" placeholder="מה לזכור? לדוגמה: לחזור ללייד דנה" style="padding:.5rem;border:1px solid #d1d5db;border-radius:6px">
            <input id="rem-date" type="date" value="${today}" style="padding:.5rem;border:1px solid #d1d5db;border-radius:6px">
            <button class="btn btn-gold" onclick="window.saveNewReminder()">הוסף</button>
          </div>
        </div>
        <div id="reminders-list" style="max-height:400px;overflow-y:auto">
          ${all.length === 0 ? '<p style="color:#9ca3af;text-align:center;padding:1rem">אין תזכורות עדיין</p>' :
            all.map(r => `
              <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem;border-bottom:1px solid #f3f4f6;${r.done?'opacity:.5':''}">
                <input type="checkbox" ${r.done?'checked':''} onchange="window.toggleReminderInModal('${r.id}')">
                <div style="flex:1">
                  <div style="${r.done?'text-decoration:line-through':''}">${escapeHtml(r.text)}</div>
                  <div style="font-size:.7rem;color:#9ca3af">${r.dueDate || 'אין תאריך'}</div>
                </div>
                <button class="btn-icon danger" onclick="window.removeReminderInModal('${r.id}')">🗑</button>
              </div>
            `).join('')
          }
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:1rem">
          <button class="btn" onclick="closeModal()">סגור</button>
        </div>
      </div>`;
    window.modal(html);
  };

  window.saveNewReminder = function(){
    const text = document.getElementById('rem-text').value.trim();
    const date = document.getElementById('rem-date').value;
    if (!text){ window.toast('הכנס טקסט','error'); return; }
    addReminder(text, date);
    if (window.toast) window.toast('✅ נוסף','success');
    window.openRemindersModal();
  };

  window.toggleReminderInModal = function(id){
    toggleDone(id);
    window.openRemindersModal();
  };

  window.removeReminderInModal = function(id){
    if (!confirm('למחוק את התזכורת?')) return;
    deleteReminder(id);
    window.openRemindersModal();
  };

  // Expose
  window.Reminders = { addReminder, deleteReminder, toggleDone, getDue, getAll, renderRemindersWidget };
})();
