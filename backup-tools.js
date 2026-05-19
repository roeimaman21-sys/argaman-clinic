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

  /** Manual backup with download (plaintext JSON) */
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

  /** Encrypted backup — AES-256-GCM with password-derived key.
   *  Output: .argbak file with metadata + ciphertext.
   *  More secure than plaintext JSON — protects backup if laptop stolen. */
  async function backupEncryptedNow(){
    if (!window.ArgSec){ window.toast?.('הצפנה לא זמינה','error'); return false; }
    // Prompt for backup password (NOT the same as login)
    const pw = prompt('הזן סיסמת גיבוי (תיזכר אותה בעת שחזור — שמור במנהל סיסמאות):');
    if (!pw){ return false; }
    if (pw.length < 8){ window.toast?.('סיסמת גיבוי קצרה מ-8','error'); return false; }
    try {
      const blob = generateBackup();
      const plaintext = await blob.text();
      // Generate random salt + IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltB64 = btoa(String.fromCharCode(...salt));
      // Derive key from password
      const derived = await window.ArgSec.deriveEncKey(pw, saltB64);
      // Encrypt
      const encrypted = await window.ArgSec.encryptJSON({ data: plaintext }, derived.key);
      // Wrap in .argbak structure
      const argbak = {
        __meta: {
          version: 'v1',
          format: 'argbak',
          algo: 'AES-256-GCM',
          kdf: 'PBKDF2-SHA256-250K',
          salt: saltB64,
          created: new Date().toISOString(),
          site: 'argamanclinic.com',
          key_hint: pw.slice(0, 1) + '*'.repeat(Math.max(0, pw.length-1))
        },
        ciphertext: encrypted
      };
      const argbakBlob = new Blob([JSON.stringify(argbak)], { type: 'application/octet-stream' });
      const date = new Date().toISOString().slice(0,10);
      downloadBlob(argbakBlob, `argaman-backup-${date}.argbak`);
      localStorage.setItem(BACKUP_KEY, new Date().toISOString());
      if (window.Audit) window.Audit.logAction('export', 'backup_encrypted', null, `Encrypted backup ${date}`);
      if (window.toast) window.toast('🔐 גיבוי מוצפן הורד. שמור את הסיסמה!', 'success');
      return true;
    } catch(e){
      console.error('Encrypted backup failed:', e);
      if (window.toast) window.toast('שגיאת גיבוי מוצפן: ' + e.message, 'error');
      return false;
    }
  }

  /** Restore from .argbak (encrypted) */
  async function restoreEncrypted(file){
    if (!window.ArgSec){ window.toast?.('הצפנה לא זמינה','error'); return false; }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const argbak = JSON.parse(e.target.result);
          if (argbak.__meta?.format !== 'argbak'){
            throw new Error('קובץ אינו .argbak תקני');
          }
          if (argbak.__meta?.site !== 'argamanclinic.com'){
            throw new Error('קובץ לא של ארגמן');
          }
          const pw = prompt(`הזן סיסמת גיבוי (רמז: ${argbak.__meta.key_hint || '???'}):`);
          if (!pw){ resolve(false); return; }
          // Derive key
          const derived = await window.ArgSec.deriveEncKey(pw, argbak.__meta.salt);
          // Decrypt
          let decrypted;
          try {
            decrypted = await window.ArgSec.decryptJSON(argbak.ciphertext, derived.key);
          } catch(decErr){
            window.toast?.('❌ סיסמה שגויה או קובץ פגום','error');
            resolve(false); return;
          }
          // Now decrypted = { data: original_json_string }
          const innerData = JSON.parse(decrypted.data);
          // Reuse existing restoreFromFile validation logic
          if (!innerData.__meta) throw new Error('קובץ פנימי לא תקין');
          const stats = `📋 לידים: ${(innerData.leads||[]).length}, 👥 לקוחות: ${(innerData.clients||[]).length}, 📅 פגישות: ${(innerData.sessions||[]).length}`;
          if (!confirm(`לשחזר נתונים מוצפנים מ-${innerData.__meta.exportedAt}?\n\n${stats}\n\n⚠️ פעולה זו תדרוס את הכל!`)) {
            return resolve(false);
          }
          // Restore
          const State = window.State;
          if (!State) throw new Error('State לא זמין');
          ['leads','clients','sessions','articles','testimonials','workshops','prices','videos','faqs','settings','templates','marketing','activity'].forEach(k => {
            if (innerData[k] !== undefined) State[k] = innerData[k];
          });
          if (typeof window.save === 'function' && window.LS){
            Object.keys(window.LS).forEach(k => {
              if (State[k] !== undefined) window.save(window.LS[k], State[k]);
            });
          }
          if (window.toast) window.toast('✅ שחזור מוצפן בוצע — מרענן...', 'success');
          setTimeout(() => location.reload(), 1500);
          resolve(true);
        } catch(err){
          if (window.toast) window.toast('שגיאת שחזור מוצפן: ' + err.message, 'error');
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('שגיאת קריאת קובץ'));
      reader.readAsText(file);
    });
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
    backupEncryptedNow,
    restoreFromFile,
    restoreEncrypted,
    exportSessionsICS,
    cleanOldAuditLogs,
    checkBackupSchedule,
    generateBackup,
    generateICS
  };

  // Aliases for convenience
  window.backupNow = backupNow;
  window.backupEncryptedNow = backupEncryptedNow;
  window.exportSessionsICS = exportSessionsICS;

  log('✓ ready');
})();
