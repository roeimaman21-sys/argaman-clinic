/* =====================================================
   cloud-realtime.js — Real-time multi-device sync
   קליניקת ארגמן · סנכרון בזמן אמת
   ─────────────────────────────────────────────────────
   Subscribes to Supabase realtime channel on argaman_data.
   When a change is detected from ANOTHER device/session:
   - Pulls the new data
   - Decrypts (if needed)
   - Updates State[key]
   - Re-renders current section
   - Shows toast "👤 נתון חדש מ-{user}"

   Last-write-wins conflict resolution (with timestamp).
   ===================================================== */
(function(){
  'use strict';

  let _sub = null;
  let _ownSessionId = null;
  let _lastUpdatedAt = {}; // key → ISO timestamp

  function log(...args) { console.log('[Realtime]', ...args); }
  function warn(...args) { console.warn('[Realtime]', ...args); }

  // Wait for Supabase + State + LS to be ready
  function waitReady(attempts) {
    if (typeof window.supa !== 'undefined' && window.supa &&
        typeof window.State !== 'undefined' &&
        typeof window.LS !== 'undefined' &&
        typeof window.CLOUD_KEYS !== 'undefined') {
      return start();
    }
    if (attempts > 80) {
      warn('Dependencies never appeared — realtime disabled');
      return;
    }
    setTimeout(() => waitReady(attempts + 1), 250);
  }

  function setStatus(state, text) {
    if (typeof window.setSyncStatus === 'function') {
      window.setSyncStatus(state, text);
    }
  }

  function showToast(msg, type = 'info') {
    if (typeof window.toast === 'function') {
      window.toast(msg, type);
    }
  }

  async function pullSingleKey(key) {
    if (!window.supa) return;
    try {
      const lsKey = window.LS && window.LS[key];
      if (!lsKey) return; // unknown key

      const { data, error } = await window.supa
        .from('argaman_data')
        .select('value, updated_at, updated_by')
        .eq('key', lsKey)
        .single();

      if (error || !data) return;
      // Skip if we already have this version (or newer)
      if (_lastUpdatedAt[lsKey] && data.updated_at <= _lastUpdatedAt[lsKey]) return;
      _lastUpdatedAt[lsKey] = data.updated_at;

      // Decrypt if encrypted
      let value = data.value;
      try {
        if (value && typeof value === 'object' && value.__enc) {
          if (!window.SESSION_ENC_KEY) {
            warn('Encrypted payload arrived but no session key — skipping', key);
            return;
          }
          value = await window.ArgSec.decryptJSON(value.data, window.SESSION_ENC_KEY);
        }
      } catch(e) {
        warn('Decrypt failed for', key, e.message);
        return;
      }

      // Update State
      if (value !== null && value !== undefined) {
        // Suppress cloudPush to avoid feedback loop
        const wasSuppress = window.cloudSuppress;
        window.cloudSuppress = true;
        try {
          window.State[key] = value;
          // Save to localStorage too (cache)
          if (typeof window.save_local === 'function') {
            window.save_local(lsKey, value);
          }
        } finally {
          window.cloudSuppress = wasSuppress;
        }

        // Re-render current section if visible
        if (typeof window.currentSection !== 'undefined' &&
            typeof window.renderers !== 'undefined' &&
            window.renderers[window.currentSection]) {
          try { window.renderers[window.currentSection](); } catch(e){}
        }

        // Update badge counts
        if (typeof window.updateBadges === 'function') {
          try { window.updateBadges(); } catch(e){}
        }

        // Notify user
        const labels = {
          clients: '👤 לקוחות עודכנו',
          leads: '🎯 לידים עודכנו',
          sessions: '📅 פגישות עודכנו',
          articles: '📝 מאמרים עודכנו',
          testimonials: '💬 המלצות עודכנו',
          workshops: '🧡 סדנאות עודכנו',
          prices: '💰 מחירים עודכנו',
          videos: '🎬 סרטונים עודכנו',
          faqs: '❓ שאלות נפוצות עודכנו',
          settings: '⚙️ הגדרות עודכנו',
          marketing: '📣 שיווק עודכן'
        };
        if (labels[key]) {
          showToast(labels[key] + ' (סונכרן ממכשיר אחר)', 'info');
          // Browser notification if tab is not in focus
          if (window.PWA && (key === 'leads' || key === 'sessions' || key === 'clients')){
            window.PWA.showLocalNotification(labels[key], 'עדכון מ-' + (window.CURRENT_USER_DISPLAY_NAME || 'משתמש אחר'), key);
          }
        }
      }
    } catch(e) {
      warn('pullSingleKey error', key, e);
    }
  }

  function handleRealtimeChange(payload) {
    if (!payload || !payload.new) return;
    const row = payload.new;
    const lsKey = row.key;
    if (!lsKey) return;

    // Skip if this change came from THIS user's session (we just wrote it)
    if (row.updated_by && _ownSessionId === row.updated_by) {
      // Same user — but maybe different tab. We can ignore safely; local save already done.
      return;
    }

    // Find the State key from LS key
    let stateKey = null;
    if (window.LS) {
      stateKey = Object.keys(window.LS).find(k => window.LS[k] === lsKey);
    }
    if (!stateKey) return;

    log('Remote change detected:', stateKey, 'at', row.updated_at);
    setStatus('syncing', 'מסונכרן');
    pullSingleKey(stateKey).finally(() => {
      setTimeout(() => setStatus('synced', 'מסונכרן'), 800);
    });
  }

  async function start() {
    if (_sub) return; // already subscribed

    // Get own user ID for filtering own changes
    try {
      if (window.supa.auth && typeof window.supa.auth.getUser === 'function') {
        const { data } = await window.supa.auth.getUser();
        _ownSessionId = data?.user?.id || null;
      }
    } catch(e){}

    log('Starting realtime subscription, own user:', _ownSessionId);
    setStatus('syncing', 'מתחבר ל-realtime');

    try {
      _sub = window.supa
        .channel('argaman_data_realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'argaman_data' },
          handleRealtimeChange
        )
        .subscribe((status) => {
          log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setStatus('synced', 'מסונכרן');
            log('✓ Realtime active — changes will arrive within ~1-2 seconds');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setStatus('error', 'שגיאת realtime');
            warn('Subscription failed:', status);
            // Retry after 5 seconds
            setTimeout(() => {
              if (_sub) {
                try { window.supa.removeChannel(_sub); } catch(e){}
                _sub = null;
              }
              start();
            }, 5000);
          }
        });
    } catch(e) {
      warn('Failed to start subscription:', e);
      setStatus('error', 'שגיאת realtime');
    }
  }

  function stop() {
    if (_sub && window.supa) {
      try { window.supa.removeChannel(_sub); } catch(e){}
      _sub = null;
      log('Realtime stopped');
    }
  }

  // Expose
  window.CloudRealtime = {
    start: () => waitReady(0),
    stop,
    pullKey: pullSingleKey,
    isActive: () => !!_sub,
    _lastUpdatedAt: () => ({..._lastUpdatedAt})
  };

  // Auto-start when CRM is logged in
  // Triggered by admin.html after successful login
  // Also expose for manual restart
  window.startRealtime = () => window.CloudRealtime.start();
  window.stopRealtime = stop;
})();
