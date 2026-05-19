/* =====================================================
   hibp-check.js — Have I Been Pwned password breach check
   Uses k-anonymity: sends only first 5 chars of SHA-1 hash
   Privacy-preserving — HIBP never sees the full password hash
   ===================================================== */
(function(){
  'use strict';

  /** Compute SHA-1 of password (HIBP API uses SHA-1) */
  async function sha1(text){
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-1', buf);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2,'0').toUpperCase())
      .join('');
  }

  /**
   * Check if a password appears in known breaches.
   * Returns: { breached: boolean, count: number, error?: string }
   * Privacy: only first 5 chars of SHA-1 sent to HIBP.
   */
  async function checkPasswordBreach(password){
    if (!password || password.length < 4) return { breached: false, count: 0 };
    try {
      const hash = await sha1(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: 'GET',
        headers: { 'Add-Padding': 'true' }
      });
      if (!res.ok) return { breached: false, count: 0, error: 'API unreachable' };

      const text = await res.text();
      // Response format: "SUFFIX:COUNT\r\nSUFFIX:COUNT\r\n..."
      const lines = text.split('\n');
      for (const line of lines){
        const [s, c] = line.trim().split(':');
        if (s === suffix){
          return { breached: true, count: parseInt(c, 10) || 0 };
        }
      }
      return { breached: false, count: 0 };
    } catch(e){
      console.warn('[HIBP] check error:', e.message);
      return { breached: false, count: 0, error: e.message };
    }
  }

  /** Check password strength (entropy + breach) */
  async function comprehensiveCheck(password){
    if (!password) return { ok: false, reason: 'no password' };

    // Length
    if (password.length < 12){
      return { ok: false, reason: 'too_short', message: 'הסיסמה קצרה מ-12 תווים' };
    }

    // Complexity (3 of 4 categories)
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const categories = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    if (categories < 3){
      return { ok: false, reason: 'weak_complexity', message: 'יש לכלול לפחות 3 מ-4: אותיות גדולות, קטנות, מספרים, סמלים' };
    }

    // HIBP breach check
    const breach = await checkPasswordBreach(password);
    if (breach.breached){
      return { ok: false, reason: 'breached', message: `🚨 סיסמה זו נחשפה ב-${breach.count.toLocaleString()} דליפות. בחר אחרת.`, count: breach.count };
    }

    return { ok: true, message: '✅ סיסמה חזקה ולא נמצאה בדליפות' };
  }

  // Expose
  window.HIBP = {
    sha1,
    checkPasswordBreach,
    comprehensiveCheck
  };
})();
