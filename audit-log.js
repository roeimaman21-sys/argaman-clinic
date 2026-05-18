/* =====================================================
   audit-log.js — Login History + Action Audit
   קליניקת ארגמן · רישום פעולות לתאימות תיקון 13
   ===================================================== */
(function(){
  'use strict';

  const UA = navigator.userAgent || '';
  function log(...a){ console.log('[Audit]', ...a); }
  function warn(...a){ console.warn('[Audit]', ...a); }

  async function getSession(){
    try {
      if (!window.supa?.auth) return null;
      const { data } = await window.supa.auth.getUser();
      return data?.user || null;
    } catch(e){ return null; }
  }

  /** Log a login-related event */
  async function logLogin(event, email, metadata){
    if (!window.supa) return;
    try {
      const user = await getSession();
      await window.supa.from('argaman_login_history').insert({
        user_id: user?.id || null,
        email: (email || user?.email || '').toLowerCase(),
        event,
        user_agent: UA.slice(0, 500),
        metadata: metadata || null
      });
    } catch(e){ warn('logLogin failed:', e.message); }
  }

  /** Log a CRUD action */
  async function logAction(action, entityType, entityId, entityLabel, metadata){
    if (!window.supa) return;
    try {
      const user = await getSession();
      if (!user) return; // only authenticated actions
      await window.supa.from('argaman_action_log').insert({
        user_id: user.id,
        user_email: (user.email || '').toLowerCase(),
        user_role: window.CURRENT_USER_ROLE || null,
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        entity_label: entityLabel || null,
        metadata: metadata || null
      });
    } catch(e){ warn('logAction failed:', e.message); }
  }

  /** Fetch login history for current user (or all if owner) */
  async function getLoginHistory(limit = 50){
    if (!window.supa) return [];
    try {
      const { data, error } = await window.supa
        .from('argaman_login_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch(e){ warn('getLoginHistory failed:', e.message); return []; }
  }

  /** Fetch action log */
  async function getActionLog(opts = {}){
    if (!window.supa) return [];
    const { limit = 100, entityType, userId } = opts;
    try {
      let q = window.supa.from('argaman_action_log').select('*')
        .order('created_at', { ascending: false }).limit(limit);
      if (entityType) q = q.eq('entity_type', entityType);
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch(e){ warn('getActionLog failed:', e.message); return []; }
  }

  // Expose
  window.Audit = { logLogin, logAction, getLoginHistory, getActionLog };
  log('✓ Audit ready');
})();
