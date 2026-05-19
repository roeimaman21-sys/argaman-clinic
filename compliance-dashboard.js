/* =====================================================
   compliance-dashboard.js — Live security & compliance widget
   Shows owner-role users the operational status of the system
   ===================================================== */
(function(){
  'use strict';

  const THRESHOLDS = {
    dpiaReview: 365,        // days
    backupVerify: 90,
    recoveryDrill: 90,
    tableTopExercise: 90,
    auditPurge: 24 * 30     // 24 months
  };

  /** Compute days since a date string */
  function daysSince(dateISO){
    if (!dateISO) return Infinity;
    const ms = Date.now() - new Date(dateISO).getTime();
    return Math.floor(ms / 86400000);
  }

  function getStoredDate(key){
    try { return localStorage.getItem(key); } catch(_) { return null; }
  }

  /** Get status icon + text for a metric */
  function statusFor(days, threshold){
    if (days === Infinity) return { icon: '🔴', label: 'מעולם לא בוצע', color: '#dc2626' };
    if (days > threshold) return { icon: '🔴', label: `${days} ימים`, color: '#dc2626' };
    if (days > threshold * 0.75) return { icon: '🟡', label: `${days} ימים`, color: '#f59e0b' };
    return { icon: '🟢', label: `${days} ימים`, color: '#16a34a' };
  }

  /** Fetch live counts from DB */
  async function fetchLiveStats(){
    if (!window.supa) return {};
    const stats = { openDsars: 0, overdueDsars: 0, anomalies: 0, recentErrors: 0 };
    try {
      const { count: openCount } = await window.supa
        .from('argaman_dsar_requests')
        .select('*', { count: 'exact', head: true })
        .is('completed_at', null);
      stats.openDsars = openCount || 0;
      const { count: overdueCount } = await window.supa
        .from('argaman_dsar_requests')
        .select('*', { count: 'exact', head: true })
        .is('completed_at', null)
        .lt('due_at', new Date().toISOString());
      stats.overdueDsars = overdueCount || 0;
    } catch(_){}
    try {
      const week = new Date(Date.now() - 7*86400000).toISOString();
      const { count } = await window.supa
        .from('argaman_error_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', week);
      stats.recentErrors = count || 0;
    } catch(_){}
    return stats;
  }

  /** Render the widget */
  async function renderWidget(){
    if (window.CURRENT_USER_ROLE !== 'owner') return '';

    const lastBackup = getStoredDate('argaman_last_backup');
    const lastVerify = getStoredDate('argaman_last_backup_verify');
    const lastDrill  = getStoredDate('argaman_last_recovery_drill');
    const lastTable  = getStoredDate('argaman_last_tabletop');
    const lastDpia   = getStoredDate('argaman_last_dpia_review') || '2026-05-19'; // initial DPIA date

    const backupStatus = statusFor(daysSince(lastBackup), THRESHOLDS.backupVerify);
    const verifyStatus = statusFor(daysSince(lastVerify), THRESHOLDS.backupVerify);
    const drillStatus  = statusFor(daysSince(lastDrill),  THRESHOLDS.recoveryDrill);
    const tableStatus  = statusFor(daysSince(lastTable),  THRESHOLDS.tableTopExercise);
    const dpiaStatus   = statusFor(daysSince(lastDpia),   THRESHOLDS.dpiaReview);

    const stats = await fetchLiveStats();
    const dsarColor = stats.overdueDsars > 0 ? '#dc2626' : stats.openDsars > 0 ? '#f59e0b' : '#16a34a';
    const dsarIcon = stats.overdueDsars > 0 ? '🔴' : stats.openDsars > 0 ? '🟡' : '🟢';

    const errColor = stats.recentErrors > 10 ? '#dc2626' : stats.recentErrors > 3 ? '#f59e0b' : '#16a34a';
    const errIcon = stats.recentErrors > 10 ? '🔴' : stats.recentErrors > 3 ? '🟡' : '🟢';

    return `
      <div class="card" style="background:linear-gradient(135deg,#f0f9ff,#ecfdf5);border-right:4px solid #16a34a;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem">
          <h3 style="color:var(--navy);display:flex;align-items:center;gap:.5rem">🛡️ Compliance Status</h3>
          <span style="font-size:.7rem;color:#6b7280">תיקון 13 · NIST CSF · OWASP ASVS L2</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem;font-size:.85rem">
          <div style="background:#fff;padding:.6rem .8rem;border-radius:8px">
            <div style="display:flex;justify-content:space-between"><span>📋 DSAR פתוחים</span><span style="color:${dsarColor}">${dsarIcon}</span></div>
            <div style="color:#6b7280;font-size:.75rem;margin-top:.2rem">${stats.openDsars} פתוחים${stats.overdueDsars?', '+stats.overdueDsars+' באיחור':''}</div>
          </div>
          <div style="background:#fff;padding:.6rem .8rem;border-radius:8px">
            <div style="display:flex;justify-content:space-between"><span>🐞 שגיאות 7 ימים</span><span style="color:${errColor}">${errIcon}</span></div>
            <div style="color:#6b7280;font-size:.75rem;margin-top:.2rem">${stats.recentErrors} ב-error_log</div>
          </div>
          <div style="background:#fff;padding:.6rem .8rem;border-radius:8px">
            <div style="display:flex;justify-content:space-between"><span>💾 גיבוי אחרון</span><span style="color:${backupStatus.color}">${backupStatus.icon}</span></div>
            <div style="color:#6b7280;font-size:.75rem;margin-top:.2rem">${backupStatus.label}</div>
          </div>
          <div style="background:#fff;padding:.6rem .8rem;border-radius:8px">
            <div style="display:flex;justify-content:space-between"><span>🔄 Recovery drill</span><span style="color:${drillStatus.color}">${drillStatus.icon}</span></div>
            <div style="color:#6b7280;font-size:.75rem;margin-top:.2rem">${drillStatus.label}</div>
          </div>
          <div style="background:#fff;padding:.6rem .8rem;border-radius:8px">
            <div style="display:flex;justify-content:space-between"><span>🎭 Table-top</span><span style="color:${tableStatus.color}">${tableStatus.icon}</span></div>
            <div style="color:#6b7280;font-size:.75rem;margin-top:.2rem">${tableStatus.label}</div>
          </div>
          <div style="background:#fff;padding:.6rem .8rem;border-radius:8px">
            <div style="display:flex;justify-content:space-between"><span>📄 DPIA review</span><span style="color:${dpiaStatus.color}">${dpiaStatus.icon}</span></div>
            <div style="color:#6b7280;font-size:.75rem;margin-top:.2rem">${dpiaStatus.label}</div>
          </div>
        </div>
        ${(stats.overdueDsars > 0 || stats.recentErrors > 10) ? `
          <div style="margin-top:.75rem;padding:.5rem .75rem;background:#fef2f2;border-right:3px solid #dc2626;border-radius:6px;font-size:.85rem;color:#7f1d1d">
            ⚠️ דורש תשומת לב: ${stats.overdueDsars > 0 ? `${stats.overdueDsars} DSAR באיחור (תיקון 13 — 30 יום). ` : ''}${stats.recentErrors > 10 ? `${stats.recentErrors} שגיאות השבוע.` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  /** Convenience: mark a drill/table-top/dpia complete */
  function markComplete(type){
    const today = new Date().toISOString();
    const map = {
      backup: 'argaman_last_backup',
      verify: 'argaman_last_backup_verify',
      drill: 'argaman_last_recovery_drill',
      tabletop: 'argaman_last_tabletop',
      dpia: 'argaman_last_dpia_review'
    };
    if (map[type]) localStorage.setItem(map[type], today);
  }

  window.ComplianceDashboard = {
    renderWidget,
    markComplete,
    fetchLiveStats
  };
})();
