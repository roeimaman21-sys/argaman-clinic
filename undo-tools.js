/* =====================================================
   undo-tools.js — Undo last delete/major action (5s window)
   ===================================================== */
(function(){
  'use strict';
  let _undoStack = [];
  const MAX_UNDO = 10;
  const TOAST_DURATION = 6000;

  /** Record an undoable action.
   *  @param {string} description — e.g. "מחיקת ליד דנה כהן"
   *  @param {function} undoFn — function that restores the state
   */
  function record(description, undoFn){
    _undoStack.push({ description, undoFn, at: Date.now() });
    if (_undoStack.length > MAX_UNDO) _undoStack.shift();
    showUndoToast(description);
  }

  function showUndoToast(description){
    // Remove any existing undo toast
    document.querySelectorAll('.undo-toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'undo-toast toast';
    t.style.cssText = 'background:#1f2937;color:#fff;display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2);max-width:400px';
    t.innerHTML = `
      <span style="flex:1">${description}</span>
      <button onclick="window.UndoTools.undo()" style="background:#C9A84C;color:#1f2937;border:none;padding:.3rem .7rem;border-radius:4px;font-weight:700;cursor:pointer">↩ ביטול</button>
    `;
    const root = document.getElementById('toast-root');
    if (root){
      root.appendChild(t);
      setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, TOAST_DURATION);
    }
  }

  function undo(){
    const action = _undoStack.pop();
    if (!action){ if (window.toast) window.toast('אין מה לבטל','warning'); return; }
    try {
      action.undoFn();
      if (window.toast) window.toast('✓ הפעולה בוטלה','success');
      document.querySelectorAll('.undo-toast').forEach(t => t.remove());
    } catch(e){
      if (window.toast) window.toast('שגיאה בביטול: ' + e.message,'error');
    }
  }

  // Keyboard shortcut: Ctrl+Z (only when not in input/textarea)
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey){
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (_undoStack.length > 0){
        e.preventDefault();
        undo();
      }
    }
  });

  window.UndoTools = { record, undo, getStack: () => [..._undoStack] };
})();
