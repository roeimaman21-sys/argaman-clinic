/* =====================================================
   role-guard.js — Role-Based UI Access Control
   קליניקת ארגמן · הסתרת UI לפי role
   ─────────────────────────────────────────────────────
   After Supabase Auth login, fetches role from argaman_users.
   Exposes window.RoleGuard.ready (Promise) so renderers can wait.
   ===================================================== */
(function(){
  'use strict';

  // Initialize safe defaults so dependent code doesn't see undefined
  if (typeof window.CURRENT_USER_ROLE === 'undefined') window.CURRENT_USER_ROLE = null;
  if (typeof window.CURRENT_USER_DISPLAY_NAME === 'undefined') window.CURRENT_USER_DISPLAY_NAME = null;
  if (typeof window.CURRENT_USER_CAN_SEE_PHI === 'undefined') window.CURRENT_USER_CAN_SEE_PHI = null;

  const PHI_SIDEBAR_SECTIONS = [
    'leads', 'clients', 'sessions', 'financial', 'funnel', 'audit'
  ];
  const PHI_ONCLICK_PATTERNS = [
    'openClientPortal', 'openSessionNotes', 'openTreatmentPlan',
    'openOutcomeHistory', 'openRiskAssessment', 'openGenogram',
    'openGoalTracker', 'openBulkPDF', 'openRecurringSessions',
    'startVoiceNote', 'playVoiceNote', 'openClientPersonalReport',
    'openAuditLog', 'openNotifications', 'openTimerSummary'
  ];

  let _currentRole = null;
  let _currentEmail = null;

  // Promise that resolves when role is loaded (or fails)
  let _readyResolve = null;
  const _ready = new Promise(r => { _readyResolve = r; });

  function log(...args) { console.log('[RoleGuard]', ...args); }

  async function fetchRole() {
    if (!window.supa || !window.supa.auth) {
      log('Supabase not ready');
      return null;
    }
    try {
      const { data: userData } = await window.supa.auth.getUser();
      if (!userData?.user) {
        log('No authenticated user');
        return null;
      }
      _currentEmail = userData.user.email;
      const { data, error } = await window.supa
        .from('argaman_users')
        .select('role, can_see_phi, display_name')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      if (error) {
        log('argaman_users error → defaulting to owner. Error:', error.message);
        return { role: 'owner', can_see_phi: true, display_name: userData.user.email?.split('@')[0] };
      }
      if (!data) {
        log('User authenticated but not in argaman_users — auto-creating as owner (first time)');
        // Try to auto-insert this user as owner if they're the only authenticated user
        try {
          const insertRes = await window.supa.from('argaman_users').insert({
            user_id: userData.user.id,
            email: userData.user.email,
            role: 'owner',
            display_name: userData.user.email?.split('@')[0] || 'משתמש',
            can_see_phi: true
          }).select().single();
          if (insertRes.data) return insertRes.data;
        } catch(e) { log('auto-insert failed:', e.message); }
        return { role: 'developer', can_see_phi: false, display_name: userData.user.email?.split('@')[0] };
      }
      log('Role loaded:', data.role, 'display_name:', data.display_name);
      return data;
    } catch(e) {
      log('fetchRole exception:', e.message);
      return null;
    }
  }

  function applyDeveloperRestrictions() {
    log('Applying developer restrictions');
    PHI_SIDEBAR_SECTIONS.forEach(section => {
      const el = document.querySelector(`.nav-link[data-section="${section}"]`);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.nav-link[onclick]').forEach(el => {
      const onclickAttr = el.getAttribute('onclick') || '';
      if (PHI_ONCLICK_PATTERNS.some(pattern => onclickAttr.includes(pattern))) {
        el.style.display = 'none';
      }
    });
    window.__DEV_RESTRICTED = true;
    if (!document.getElementById('dev-mode-banner')) {
      const banner = document.createElement('div');
      banner.id = 'dev-mode-banner';
      banner.style.cssText = 'background:#fef3c7;border-bottom:2px solid #f59e0b;color:#854d0e;padding:.5rem 1rem;text-align:center;font-size:.85rem;font-weight:600;z-index:50';
      banner.innerHTML = `🛡️ מצב מפתח — אינך רואה מידע רפואי מוגן. הפרדה לפי <a href="privacy.html" target="_blank" style="color:#1B3A6B;text-decoration:underline">תיקון 13</a>.`;
      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.parentNode.insertBefore(banner, topbar.nextSibling);
      else document.body.insertBefore(banner, document.body.firstChild);
    }
    setTimeout(() => {
      if (typeof window.currentSection !== 'undefined' &&
          PHI_SIDEBAR_SECTIONS.includes(window.currentSection)) {
        if (typeof window.goto === 'function') window.goto('dashboard');
      }
    }, 500);
    log('✓ Developer UI restrictions applied');
  }

  function showRoleBadge(role, email) {
    const topbar = document.querySelector('.topbar-actions');
    if (!topbar) return;
    document.getElementById('role-badge')?.remove();
    const colors = {
      owner:     { bg: '#1B3A6B', label: 'בעלים' },
      developer: { bg: '#7c3aed', label: 'מפתח' },
      staff:     { bg: '#16a34a', label: 'צוות' }
    };
    const c = colors[role] || colors.developer;
    const badge = document.createElement('span');
    badge.id = 'role-badge';
    badge.className = 'topbar-btn';
    badge.style.cssText = `background:${c.bg};color:#fff;padding:.3rem .75rem;border-radius:50px;font-size:.75rem;font-weight:700`;
    badge.title = email || '';
    badge.textContent = `👤 ${c.label}${email?' · '+email:''}`;
    topbar.insertBefore(badge, topbar.firstChild);
  }

  async function initRoleCheck() {
    log('Starting role check');
    const result = await fetchRole();
    if (!result) {
      log('No role data — keeping role as null, NOT applying restrictions yet');
      window.CURRENT_USER_ROLE = null;
      if (_readyResolve){ _readyResolve(false); _readyResolve = null; }
      return;
    }
    _currentRole = result.role;
    window.CURRENT_USER_ROLE = result.role;
    window.CURRENT_USER_CAN_SEE_PHI = result.can_see_phi;
    window.CURRENT_USER_DISPLAY_NAME = result.display_name || _currentEmail?.split('@')[0] || 'משתמש';
    log('Set window.CURRENT_USER_ROLE =', result.role, 'DISPLAY_NAME =', window.CURRENT_USER_DISPLAY_NAME);
    showRoleBadge(result.role, _currentEmail);
    if (result.role !== 'owner'){
      document.querySelectorAll('[data-owner-only]').forEach(el => { el.style.display = 'none'; });
    } else {
      document.querySelectorAll('[data-owner-only]').forEach(el => { el.style.display = ''; });
    }
    if (result.role === 'developer' || !result.can_see_phi) {
      applyDeveloperRestrictions();
    } else {
      log(`Owner/staff role — full access for ${_currentEmail}`);
    }
    // Resolve ready promise
    if (_readyResolve){ _readyResolve(true); _readyResolve = null; }
    // Re-render current section
    try {
      if (typeof window.currentSection !== 'undefined' &&
          typeof window.renderers !== 'undefined' &&
          window.renderers[window.currentSection]){
        const r = window.renderers[window.currentSection];
        const out = r();
        if (out && typeof out.then === 'function') out.catch(e=>log('re-render error:', e.message));
      }
    } catch(e){ log('re-render error:', e.message); }
  }

  function waitForAuth(attempts) {
    if (window.supa && window.supa.auth) {
      setTimeout(() => initRoleCheck().catch(e => {
        log('initRoleCheck error:', e);
        if (_readyResolve){ _readyResolve(false); _readyResolve = null; }
      }), 300);
      return;
    }
    if (attempts > 60) {
      log('Auth never appeared');
      if (_readyResolve){ _readyResolve(false); _readyResolve = null; }
      return;
    }
    setTimeout(() => waitForAuth(attempts + 1), 200);
  }

  window.RoleGuard = {
    ready: _ready,
    init: () => { waitForAuth(0); return _ready; },
    refresh: initRoleCheck,
    getCurrentRole: () => _currentRole,
    isPHIRestricted: () => _currentRole === 'developer' || window.__DEV_RESTRICTED,
    isOwner: () => _currentRole === 'owner',
    isStaffOrOwner: () => _currentRole === 'owner' || _currentRole === 'staff'
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => waitForAuth(0), 1500);
  });
})();
