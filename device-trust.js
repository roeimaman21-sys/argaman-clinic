/* =====================================================
   device-trust.js — Silent device fingerprinting + recognition
   On each login: compute fingerprint, save/update, alert if new
   ===================================================== */
(function(){
  'use strict';

  /** Compute stable device fingerprint (no PII, no canvas) */
  async function computeFingerprint(){
    const tokens = [
      navigator.userAgent || '',
      navigator.language || '',
      navigator.languages?.join(',') || '',
      navigator.hardwareConcurrency || '',
      navigator.platform || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      new Date().getTimezoneOffset()
    ].join('|');
    const buf = new TextEncoder().encode(tokens);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 32);
  }

  /** Fetch IP geolocation (free service, no auth) */
  async function fetchGeo(){
    try {
      const res = await fetch('https://ipapi.co/json/', { method: 'GET', cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        country: data.country_code || data.country || null,
        city: data.city || null,
        region: data.region || null,
        ip: data.ip ? data.ip.replace(/\.\d+$/, '.0') : null // anonymize last octet
      };
    } catch(_) { return null; }
  }

  /** Send anomaly alert via FormSubmit (already used for contact form) */
  async function sendAnomalyAlert(subject, body){
    try {
      // FormSubmit AJAX endpoint to argamanclinic@gmail.com
      await fetch('https://formsubmit.co/ajax/argamanclinic@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: subject,
          message: body,
          _captcha: 'false'
        })
      });
    } catch(e){ console.warn('[DeviceTrust] alert failed:', e); }
  }

  /** Build human-readable device label */
  function buildLabel(ua, geo){
    let device = 'מכשיר לא ידוע';
    if (/iPhone/.test(ua)) device = 'iPhone';
    else if (/iPad/.test(ua)) device = 'iPad';
    else if (/Android/.test(ua)) device = 'Android';
    else if (/Macintosh/.test(ua)) device = 'Mac';
    else if (/Windows/.test(ua)) device = 'Windows';
    else if (/Linux/.test(ua)) device = 'Linux';

    let browser = 'דפדפן';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\/[0-9]+/.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

    const loc = geo?.city ? `${geo.city}${geo.country?', '+geo.country:''}` : (geo?.country || '');
    return loc ? `${device} · ${browser} · ${loc}` : `${device} · ${browser}`;
  }

  /** Check device + record. Alert if new. */
  async function checkAndRecord(){
    if (!window.supa) return null;
    try {
      const { data: userData } = await window.supa.auth.getUser();
      const user = userData?.user;
      if (!user) return null;

      const [fp, geo] = await Promise.all([computeFingerprint(), fetchGeo()]);

      // Check if device already exists for this user
      const { data: existing } = await window.supa
        .from('argaman_trusted_devices')
        .select('id, first_seen, label')
        .eq('user_id', user.id)
        .eq('fingerprint', fp)
        .maybeSingle();

      const label = buildLabel(navigator.userAgent, geo);

      if (existing){
        // Known device — silent update of last_seen
        await window.supa.from('argaman_trusted_devices')
          .update({ last_seen: new Date().toISOString(), geo_country: geo?.country, geo_city: geo?.city })
          .eq('id', existing.id);
        return { isNew: false, label: existing.label };
      } else {
        // NEW device — record + alert
        await window.supa.from('argaman_trusted_devices').insert({
          user_id: user.id,
          fingerprint: fp,
          label,
          user_agent: (navigator.userAgent || '').slice(0, 300),
          geo_country: geo?.country,
          geo_city: geo?.city,
          is_trusted: true // auto-trust first time (after explicit login)
        });

        // Alert: was this you?
        await sendAnomalyAlert(
          '🔐 התחברות חדשה לקליניקת ארגמן CRM',
          `התחברות חדשה זוהתה מ:

מכשיר: ${label}
מיקום: ${geo?.city || ''}${geo?.country ? ', ' + geo.country : ''}
זמן: ${new Date().toLocaleString('he-IL')}
משתמש: ${user.email}

אם זה אתה — הכל בסדר, התעלם מההודעה.
אם לא — שנה סיסמה מיד ב-${location.origin}/admin.html`
        );

        // Log to audit
        try {
          window.Audit?.logLogin('login_success', user.email, { new_device: true, label, geo });
        } catch(_){}

        return { isNew: true, label };
      }
    } catch(e){
      console.warn('[DeviceTrust] checkAndRecord error:', e.message);
      return null;
    }
  }

  /** List user's trusted devices (for profile page) */
  async function listMyDevices(){
    if (!window.supa) return [];
    try {
      const { data } = await window.supa.from('argaman_trusted_devices')
        .select('*')
        .order('last_seen', { ascending: false });
      return data || [];
    } catch(_) { return []; }
  }

  /** Revoke a device (force re-auth on next login from there) */
  async function revokeDevice(deviceId){
    if (!window.supa) return false;
    try {
      const { error } = await window.supa.from('argaman_trusted_devices')
        .delete()
        .eq('id', deviceId);
      return !error;
    } catch(_) { return false; }
  }

  // Expose
  window.DeviceTrust = {
    check: checkAndRecord,
    listMyDevices,
    revokeDevice,
    computeFingerprint
  };

  // Auto-run on login (delayed so supa + user is ready)
  window.addEventListener('DOMContentLoaded', () => {
    // Wait for login flow + supa ready
    let attempts = 0;
    const tryCheck = setInterval(async () => {
      attempts++;
      if (window.supa) {
        const { data } = await window.supa.auth.getUser();
        if (data?.user) {
          clearInterval(tryCheck);
          setTimeout(() => checkAndRecord(), 2000); // after login flow settles
        }
      }
      if (attempts > 30) clearInterval(tryCheck);
    }, 1000);
  });
})();
