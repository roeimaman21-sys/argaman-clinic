/* =====================================================
   backup-tools.js — Auto-backup, retention, calendar export
   קליניקת ארגמן · גיבוי וכלי שמירה
   ===================================================== */
(function(){
  'use strict';
  const BACKUP_KEY = 'argaman_last_backup';
  const BACKUP_INTERVAL_DAYS = 7;
  const RETENTION_MONTHS = 12;

  function log(...a){ console.log('[Backup]', ...a); }

  /** Generate a full backup as JSON Blob */
  function generateBackup(){
    const State = window.State || {};
    const payload = {
      __meta: {
        version: 1,
        exportedAt: new Date().toISOString(),
        exportedBy: window.CURRENT_USER_DISPLAY_NAME || 'unknown',
        site: 'argamanclinic.com'
      },
      leads: State.leads || [],
      clients: State.clients || [],
      sessions: State.sessions || [],
      articles: State.articles || [],
      testimonials: State.testimonials || [],
      workshops: State.workshops || [],
      prices: State.prices || {},
      videos: State.videos || [],
      faqs: State.faqs || [],
      settings: State.settings || {},
      templates: State.templates || [],
      marketing: State.marketing || {},
      activity: (State.activity || []).slice(0, 200)
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Manual backup with download */
  function backupNow(){
    try {
      const blob = generateBackup();
      const date = new Date().toISOString().slice(0,10);
      downloadBlob(blob, `argaman-backup-${date}.json`);
      localStorage.setItem(BACKUP_KEY, new Date().toISOString());
      if (window.Audit) window.Audit.logAction('export', 'backup', null, `Backup ${date}`);
      if (window.toast) window.toast('✅ גיבוי הורד בהצלחה', 'success');
      return true;
    } catch(e){
      console.error('Backup failed:', e);
      if (window.toast) window.toast('שגיאת גיבוי: ' + e.message, 'error');
      return false;
    }
  }

  /** Restore from JSON file */
  function restoreFromFile(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          // Schema validation
          if (!data || typeof data !== 'object') throw new Error('קובץ לא תקין — מבנה JSON שגוי');
          if (!data.__meta) throw new Error('קובץ לא תקין — חסר metadata. ייתכן שהקובץ אינו גיבוי של קליניקת ארגמן.');
          if (data.__meta.site && data.__meta.site !== 'argamanclinic.com'){
            throw new Error('קובץ לא של קליניקת ארגמן (site=' + data.__meta.site + ')');
          }
          if (!data.__meta.version) console.warn('Backup version missing — proceeding with caution');
          // Sanity check on data shapes
          ['leads','clients','sessions','articles'].forEach(k => {
            if (data[k] !== undefined && !Array.isArray(data[k])){
              throw new Error(`שדה ${k} חייב להיות מערך`);
            }
          });
          const stats = `📋 לידים: ${(data.leads||[]).length}, 👥 לקוחות: ${(data.clients||[]).length}, 📅 פגישות: ${(data.sessions||[]).length}, 📝 מאמרים: ${(data.articles||[]).length}`;
          if (!confirm(`לשחזר נתונים מ-${data.__meta.exportedAt}?\n\n${stats}\n\n⚠️ פעולה זו תדרוס את כל הנתונים הנוכחיים!`)) {
            return resolve(false);
          }
          // Restore each key
          const State = window.State;
          if (!State) throw new Error('State לא זמין');
          ['leads','clients','sessions','articles','testimonials','workshops','prices','videos','faqs','settings','templates','marketing','activity'].forEach(k => {
            if (data[k] !== undefined) State[k] = data[k];
          });
          // Save back to localStorage if save function available
          if (typeof window.save === 'function' && window.LS){
            Object.keys(window.LS).forEach(k => {
              if (State[k] !== undefined) window.save(window.LS[k], State[k]);
            });
          }
          if (window.toast) window.toast('✅ שחזור בוצע — מרענן...', 'success');
          setTimeout(() => location.reload(), 1500);
          resolve(true);
        } catch(err){
          if (window.toast) window.toast('שגיאת שחזור: ' + err.message, 'error');
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('שגיאת קריאת קובץ'));
      reader.readAsText(file);
    });
  }

  /** Check if backup is overdue + auto-prompt */
  function checkBackupSchedule(){
    const last = localStorage.getItem(BACKUP_KEY);
    if (!last) return { overdue: true, daysAgo: 999 };
    const daysAgo = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    return { overdue: daysAgo >= BACKUP_INTERVAL_DAYS, daysAgo };
  }

  /** Generate ICS file for sessions (Google Calendar / Outlook / Apple) */
  function generateICS(sessions, clientNameMap){
    const now = new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Argaman Clinic//CRM//HE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:קליניקת ארגמן',
      'X-WR-TIMEZONE:Asia/Jerusalem'
    ];
    sessions.forEach(s => {
      if (!s.date || !s.time) return;
      const dt = s.date.replace(/-/g,'') + 'T' + s.time.replace(/:/g,'') + '00';
      const dtEnd = new Date(s.date + 'T' + s.time + ':00');
      dtEnd.setMinutes(dtEnd.getMinutes() + (parseInt(s.duration) || 60));
      const dtEndStr = dtEnd.getFullYear() +
        String(dtEnd.getMonth()+1).padStart(2,'0') +
        String(dtEnd.getDate()).padStart(2,'0') + 'T' +
        String(dtEnd.getHours()).padStart(2,'0') +
        String(dtEnd.getMinutes()).padStart(2,'0') + '00';
      const clientName = clientNameMap?.[s.clientId] || s.clientName || 'לקוח';
      const summary = (s.title || `פגישה - ${clientName}`).replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
      const desc = (s.notes || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
      const loc = (s.location || 'מתקיים בקליניקה').replace(/[,;\\]/g, '\\$&');
      lines.push(
        'BEGIN:VEVENT',
        `UID:argaman-${s.id}@argamanclinic.com`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=Asia/Jerusalem:${dt}`,
        `DTEND;TZID=Asia/Jerusalem:${dtEndStr}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${loc}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:תזכורת: ${summary}`,
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function exportSessionsICS(){
    const State = window.State || {};
    const sessions = (State.sessions || []).filter(s => s.date && new Date(s.date) >= new Date(Date.now() - 30*86400000));
    if (sessions.length === 0){
      if (window.toast) window.toast('אין פגישות לייצא', 'warning');
      return;
    }
    const clientMap = {};
    (State.clients || []).forEach(c => clientMap[c.id] = c.name);
    const ics = generateICS(sessions, clientMap);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    downloadBlob(blob, `argaman-sessions-${new Date().toISOString().slice(0,10)}.ics`);
    if (window.toast) window.toast(`✅ יוצאו ${sessions.length} פגישות לקובץ ICS`, 'success');
    if (window.Audit) window.Audit.logAction('export','sessions',null,`ICS export (${sessions.length})`);
  }

  /** Audit retention — delete logs older than 12 months */
  async function cleanOldAuditLogs(){
    if (!window.supa) return { error: 'Supabase לא זמין' };
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
    const cutoffISO = cutoff.toISOString();
    try {
      const a = await window.supa.from('argaman_login_history').delete().lt('created_at', cutoffISO);
      const b = await window.supa.from('argaman_action_log').delete().lt('created_at', cutoffISO);
      if (window.toast) window.toast('✅ יומנים ישנים נוקו', 'success');
      return { ok: true };
    } catch(e){
      if (window.toast) window.toast('שגיאת ניקוי: ' + e.message, 'error');
      return { error: e.message };
    }
  }

  // Auto-backup reminder banner injection (every Monday)
  function maybeShowBackupBanner(){
    const status = checkBackupSchedule();
    if (!status.overdue) return;
    if (document.getElementById('backup-reminder-banner')) return;
    // Just rely on the existing dashboard renderBackupReminder. This is supplementary.
  }

  // Expose
  window.BackupTools = {
    backupNow,
    restoreFromFile,
    exportSessionsICS,
    cleanOldAuditLogs,
    checkBackupSchedule,
    generateBackup,
    generateICS
  };

  // Aliases for convenience
  window.backupNow = backupNow;
  window.exportSessionsICS = exportSessionsICS;

  log('✓ ready');
})();
