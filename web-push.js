/* =====================================================
   web-push.js — Real Web Push subscription (VAPID)
   ─────────────────────────────────────────────────────
   Client side only — stores subscription in Supabase.
   To actually SEND push: deploy a Supabase Edge Function
   with the VAPID private key (see WEB-PUSH-SETUP.md).
   ===================================================== */
(function(){
  'use strict';
  const VAPID_PUBLIC_KEY = 'BP_yIPPPk5PQKXoPWo9oVU_KHRj9sx-sQi5KPGWMhwuYEGefL98jez6vouuF4DzU4v9vo7Xl8ByHYLfrtr_V6uw';

  function log(...a){ console.log('[WebPush]', ...a); }

  function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  async function subscribe(){
    if (!('serviceWorker' in navigator) || !('PushManager' in window)){
      return { error: 'הדפדפן לא תומך ב-Push' };
    }
    try {
      // Ensure SW is registered (web-push needs SW)
      let reg = await navigator.serviceWorker.getRegistration('/admin.html');
      if (!reg){
        reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      }
      // Permission
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return { error: 'הרשאה נדחתה' };
      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      // Store in Supabase
      if (window.supa){
        const user = (await window.supa.auth.getUser()).data?.user;
        if (user){
          await window.supa.from('argaman_push_subscriptions').upsert({
            user_id: user.id,
            endpoint: sub.endpoint,
            keys: sub.toJSON().keys,
            user_agent: navigator.userAgent.slice(0,300),
            created_at: new Date().toISOString()
          }, { onConflict: 'endpoint' });
        }
      }
      log('Subscribed:', sub.endpoint);
      return { success: true, endpoint: sub.endpoint };
    } catch(e){
      log('Subscribe error:', e);
      return { error: e.message };
    }
  }

  async function unsubscribe(){
    try {
      const reg = await navigator.serviceWorker.getRegistration('/admin.html')
                 || await navigator.serviceWorker.getRegistration('/');
      if (!reg) return { error: 'אין SW רשום' };
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return { error: 'אין subscription פעיל' };
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      if (window.supa){
        await window.supa.from('argaman_push_subscriptions').delete().eq('endpoint', endpoint);
      }
      return { success: true };
    } catch(e){ return { error: e.message }; }
  }

  async function isSubscribed(){
    try {
      const reg = await navigator.serviceWorker.getRegistration('/admin.html')
                 || await navigator.serviceWorker.getRegistration('/');
      if (!reg) return false;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch(_){ return false; }
  }

  window.WebPush = { subscribe, unsubscribe, isSubscribed, VAPID_PUBLIC_KEY };
})();
