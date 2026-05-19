/* =====================================================
   optimistic.js — Optimistic UI pattern for instant feedback
   ===================================================== */
(function(){
  'use strict';

  /**
   * Optimistic update: apply change to State + UI immediately,
   * sync to cloud in background. Rollback on failure.
   *
   * @param {object} options
   * @param {function} options.apply - sync mutation to State + UI
   * @param {function} options.sync - async function returning Promise (the actual save)
   * @param {function} options.rollback - sync function to revert if sync fails
   * @param {string} [options.label] - human label for toast
   */
  async function optimistic({ apply, sync, rollback, label }){
    try {
      apply();
    } catch(e){
      console.error('[Optimistic] apply error:', e);
      window.toast?.('שגיאה: ' + e.message, 'error');
      return;
    }
    try {
      const result = sync();
      if (result && typeof result.then === 'function'){
        await result;
      }
    } catch(e){
      console.error('[Optimistic] sync error:', e);
      try { rollback(); } catch(re){ console.error('Rollback failed:', re); }
      window.toast?.(`❌ ${label || 'השינוי'} לא נשמר — חזר למצב קודם`, 'error');
    }
  }

  /** Helper for status changes — common pattern */
  function changeStatus(entity, prop, newValue, saveFn, label){
    const oldValue = entity[prop];
    return optimistic({
      apply: () => {
        entity[prop] = newValue;
        if (window.renderers && window.currentSection){
          try { window.renderers[window.currentSection](); } catch(_){}
        }
      },
      sync: saveFn,
      rollback: () => {
        entity[prop] = oldValue;
        if (window.renderers && window.currentSection){
          try { window.renderers[window.currentSection](); } catch(_){}
        }
      },
      label: label || 'שינוי סטטוס'
    });
  }

  if (window.CRM){
    window.CRM.optimistic = optimistic;
    window.CRM.changeStatus = changeStatus;
  }
  window.Optimistic = { optimistic, changeStatus };
})();
