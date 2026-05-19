/* =====================================================
   presence.js — Real-time user presence
   קליניקת ארגמן · מי מחובר עכשיו
   ===================================================== */
(function(){
  'use strict';
  let _channel = null;
  let _onlineUsers = [];

  function log(...a){ console.log('[Presence]', ...a); }

  async function start(){
    if (_channel) return;
    if (!window.supa) return;
    const user = (await window.supa.auth.getUser())?.data?.user;
    if (!user) return;

    const displayName = window.CURRENT_USER_DISPLAY_NAME || user.email;
    const role = window.CURRENT_USER_ROLE || 'unknown';

    _channel = window.supa.channel('argaman_presence', {
      config: { presence: { key: user.id } }
    });

    _channel
      .on('presence', { event: 'sync' }, () => {
        const state = _channel.presenceState();
        _onlineUsers = [];
        Object.entries(state).forEach(([userId, metas]) => {
          if (metas && metas[0]) _onlineUsers.push(metas[0]);
        });
        renderPresence();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED'){
          await _channel.track({
            user_id: user.id,
            email: user.email,
            display_name: displayName,
            role,
            online_at: new Date().toISOString()
          });
          log('✓ tracking presence as', displayName);
        }
      });
  }

  function renderPresence(){
    let host = document.getElementById('presence-indicator');
    if (!host){
      const topbar = document.querySelector('.topbar-actions');
      if (!topbar) return;
      host = document.createElement('div');
      host.id = 'presence-indicator';
      host.style.cssText = 'display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:#16a34a;font-weight:600';
      topbar.insertBefore(host, topbar.firstChild);
    }
    const count = _onlineUsers.length;
    const others = _onlineUsers.filter(u => u.user_id !== (window.supa?.auth?.getUser ? null : null));
    const names = _onlineUsers.map(u => u.display_name || u.email).join(', ');
    host.innerHTML = `<span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite"></span> ${count} מחובר${count===1?'':'ים'}`;
    host.title = names;
  }

  function stop(){
    if (_channel && window.supa){
      try { window.supa.removeChannel(_channel); } catch(_){}
      _channel = null;
    }
  }

  const PresenceAPI = { start, stop, getOnlineUsers: () => [..._onlineUsers] };
  window.Presence = PresenceAPI;
  if (window.CRM && window.CRM.register) window.CRM.register('Presence', PresenceAPI);
  log('✓ ready');
})();
