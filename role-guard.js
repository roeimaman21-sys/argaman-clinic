/* =====================================================
   role-guard.js — Role-Based UI Access Control
   קליניקת ארגמן · הסתרת UI לפי role
   ─────────────────────────────────────────────────────
   After Supabase Auth login, fetches role from argaman_users.
   For 'developer' role: hides PHI-related sidebar items + sections.
   For 'owner' / 'staff': shows full UI.
   ===================================================== */
(function(){
  'use strict';

  // Sidebar items that should be HIDDEN for developer role (contain PHI)
  const PHI_SIDEBAR_SECTIONS = [
    'leads',         // 🎯 לידים
    'clients',       // 👥 לקוחות
    'sessions',      // 📅 פגישות ולוח שנה
    'financial',     // 💵 פיננסי
    'funnel',        // 📈 משפך המרה
    'audit'          // 📋 יומן פעולות (contains client names in entries)
  ];

  // Sidebar items hidden for developer role by onclick handler (no data-section)
  const PHI_ONCLICK_PATTERNS = [
    'openClientPortal', 'openSessionNotes', 'openTreatmentPlan',
    'openOutcomeHistory', 'openRiskAssessment', 'openGenogram',
    'openGoalTracker', 'openBulkPDF', 'openRecurringSessions',
    'startVoiceNote', 'playVoiceNote', 'openClientPersonalReport',
    'openAuditLog', 'openNotifications', 'openTimerSummary'
  ];

  let _currentRole = null;
  let _currentEmail = null;

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

      // Try to fetch role from argaman_users table
      const { data, error } = await window.supa
        .from('argaman_users')
        .select('role, can_see_phi, display_name')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (error) {
        // If table doesn't exist yet (pre-migration), fail gracefully → default to owner
        log('argaman_users not configured, defaulting to owner. Error:', error.message);
        return { role: 'owner', can_see_phi: true };
      }

      if (!data) {
        // User authenticated but not in argaman_users → restrict
        log('User authenticated but not in argaman_users — restricting to developer view');
        return { role: 'developer', can_see_phi: false };
      }

      log('Role loaded:', data.role, 'can_see_phi:', data.can_see_phi);
      return data;
    } catch(e) {
      log('fetchRole error:', e.message);
      // Network or other error — be safe, restrict
      return null;
    }
  }

  function applyDeveloperRestrictions() {
    log('Applying developer restrictions');

    // 1. Hide sidebar items by data-section
    PHI_SIDEBAR_SECTIONS.forEach(section => {
      const el = document.querySelector(`.nav-link[data-section="${section}"]`);
      if (el) el.style.display = 'none';
    });

    // 2. Hide sidebar items by onclick handler containing PHI function names
    document.querySelectorAll('.nav-link[onclick]').forEach(el => {
      const onclickAttr = el.getAttribute('onclick') || '';
      if (PHI_ONCLICK_PATTERNS.some(pattern => onclickAttr.includes(pattern))) {
        el.style.display = 'none';
      }
    });

    // 3. Disable PHI rendering in dashboard
    window.__DEV_RESTRICTED = true;

    // 4. Show banner
    if (!document.getElementById('dev-mode-banner')) {
      const banner = document.createElement('div');
      banner.id = 'dev-mode-banner';
      banner.style.cssText = 'background:#fef3c7;border-bottom:2px solid #f59e0b;color:#854d0e;padding:.5rem 1rem;text-align:center;font-size:.85rem;font-weight:600;z-index:50';
      banner.innerHTML = `🛡️ מצב מפתח — אינך רואה מידע רפואי מוגן (לקוחות, לידים, פגישות). זאת הפרדה לפי <a href="privacy.html" target="_blank" style="color:#1B3A6B;text-decoration:underline">תיקון 13</a> לחוק הגנת הפרטיות.`;
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.parentNode.insertBefore(banner, topbar.nextSibling);
      } else {
        document.body.insertBefore(banner, document.body.firstChild);
      }
    }

    // 5. Auto-redirect from PHI sections if landed there
    setTimeout(() => {
      if (typeof window.currentSection !== 'undefined' &&
          PHI_SIDEBAR_SECTIONS.includes(window.currentSection)) {
        if (typeof window.goto === 'function') window.goto('dashboard');
      }
    }, 500);

    log('✓ Developer UI restrictions applied');
  }

  function showRoleBadge(role, email) {
    // Add a small badge in the topbar showing current user
    const topbar = document.querySelector('.topbar-actions');
    if (!topbar || document.getElementById('role-badge')) return;

    const colors = {
      owner: { bg: '#1B3A6B', label: 'בעלים' },
      developer: { bg: '#7c3aed', label: 'מפתח' },
      staff: { bg: '#16a34a', label: 'צוות' }
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
      // No role data — default to most restrictive
      log('No role data — restricting');
      _currentRole = 'developer';
      applyDeveloperRestrictions();
      showRoleBadge('developer', _currentEmail || 'guest');
      return;
    }

    _currentRole = result.role;
    window.CURRENT_USER_ROLE = result.role;
    window.CURRENT_USER_CAN_SEE_PHI = result.can_see_phi;

    showRoleBadge(result.role, _currentEmail);

    if (result.role === 'developer' || !result.can_see_phi) {
      applyDeveloperRestrictions();
    } else {
      log(`Owner/staff role — full access for ${_currentEmail}`);
    }
  }

  // Wait for supa + auth to be ready, then check role
  function waitForAuth(attempts) {
    if (window.supa && window.supa.auth) {
      // Wait a bit more for auth state to settle
      setTimeout(() => initRoleCheck().catch(e => log('initRoleCheck error:', e)), 500);
      return;
    }
    if (attempts > 60) {
      log('Auth never appeared');
      return;
    }
    setTimeout(() => waitForAuth(attempts + 1), 300);
  }

  // Expose
  window.RoleGuard = {
    init: () => waitForAuth(0),
    getCurrentRole: () => _currentRole,
    refresh: initRoleCheck,
    isPHIRestricted: () => _currentRole === 'developer' || window.__DEV_RESTRICTED
  };

  // Listen for auth state changes (login/logout)
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => waitForAuth(0), 2000);
  });
})();
