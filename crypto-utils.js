/* =====================================================
   crypto-utils.js — קליניקת ארגמן
   הצפנה צד-לקוח, גיבוב סיסמאות, אבטחת מידע רגיש
   תואם תקנות הגנת הפרטיות (אבטחת מידע) התשע"ז-2017
   ===================================================== */
(function(global){
  'use strict';

  const subtle = (global.crypto && global.crypto.subtle) || null;
  if (!subtle) {
    console.error('[SEC] Web Crypto API not available. Browser too old or insecure context.');
  }

  /* ---------- helpers ---------- */
  function bufToB64(buf){
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64ToBuf(b64){
    const s = atob(b64);
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }
  function strToBuf(str){ return new TextEncoder().encode(str); }
  function bufToStr(buf){ return new TextDecoder().decode(buf); }
  function randomBytes(n){ const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }

  /* ---------- PBKDF2 key derivation ---------- */
  // 250,000 iterations is OWASP 2023 recommendation for PBKDF2-SHA256
  const PBKDF2_ITERATIONS = 250000;
  const PBKDF2_HASH = 'SHA-256';

  async function importPasswordKey(password){
    return await subtle.importKey(
      'raw', strToBuf(password),
      { name: 'PBKDF2' },
      false, ['deriveBits', 'deriveKey']
    );
  }

  /**
   * Derive an AES-GCM 256-bit encryption key from password + salt.
   */
  async function deriveEncKey(password, saltB64){
    const baseKey = await importPasswordKey(password);
    const salt = saltB64 ? new Uint8Array(b64ToBuf(saltB64)) : randomBytes(16);
    const key = await subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false, // not extractable — key never leaves memory
      ['encrypt', 'decrypt']
    );
    return { key, salt: bufToB64(salt) };
  }

  /**
   * Hash a password with salt for storage. Returns "v1:salt:hash" string.
   */
  async function hashPassword(password, existingSaltB64){
    const baseKey = await importPasswordKey(password);
    const salt = existingSaltB64 ? new Uint8Array(b64ToBuf(existingSaltB64)) : randomBytes(16);
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
      baseKey, 256
    );
    return `v1:${bufToB64(salt)}:${bufToB64(bits)}`;
  }

  /**
   * Constant-time string compare to avoid timing attacks.
   */
  function safeEqual(a, b){
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /**
   * Verify password against stored hash.
   */
  async function verifyPassword(password, stored){
    if (!stored || !stored.startsWith('v1:')) return false;
    const [, saltB64, expectedHash] = stored.split(':');
    const candidate = await hashPassword(password, saltB64);
    const [, , candHash] = candidate.split(':');
    return safeEqual(candHash, expectedHash);
  }

  /* ---------- AES-GCM encrypt/decrypt ---------- */
  async function encrypt(plainText, key){
    if (plainText == null) return null;
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      strToBuf(typeof plainText === 'string' ? plainText : JSON.stringify(plainText))
    );
    // Bundle: "enc:v1:iv_b64:cipher_b64"
    return `enc:v1:${bufToB64(iv)}:${bufToB64(cipher)}`;
  }

  async function decrypt(bundle, key){
    if (!bundle || typeof bundle !== 'string' || !bundle.startsWith('enc:v1:')) {
      // Not encrypted — return as-is (graceful migration)
      return bundle;
    }
    try {
      const parts = bundle.split(':');
      const iv = new Uint8Array(b64ToBuf(parts[2]));
      const cipher = b64ToBuf(parts[3]);
      const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      return bufToStr(plain);
    } catch (e) {
      console.error('[SEC] Decryption failed:', e?.message || e);
      throw new Error('פענוח נתונים נכשל — ייתכן שהסיסמה שגויה');
    }
  }

  /**
   * Encrypt an object or value, returning the bundle string.
   */
  async function encryptJSON(obj, key){
    return await encrypt(JSON.stringify(obj), key);
  }

  /**
   * Decrypt a bundle string and parse JSON. Returns original if not encrypted.
   */
  async function decryptJSON(bundle, key){
    const plain = await decrypt(bundle, key);
    if (plain == null) return null;
    if (typeof plain === 'string' && (plain.startsWith('{') || plain.startsWith('[') || plain.startsWith('"'))) {
      try { return JSON.parse(plain); } catch { return plain; }
    }
    return plain;
  }

  /* ---------- Generate strong password ---------- */
  function generatePassword(length){
    length = length || 16;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const out = new Array(length);
    const rnd = randomBytes(length);
    for (let i = 0; i < length; i++) out[i] = chars[rnd[i] % chars.length];
    return out.join('');
  }

  /**
   * Password strength score 0-100. Used for live feedback.
   */
  function passwordStrength(pw){
    if (!pw) return { score: 0, label: 'ריקה', color: '#dc2626' };
    let score = 0;
    if (pw.length >= 8)  score += 20;
    if (pw.length >= 12) score += 15;
    if (pw.length >= 16) score += 15;
    if (/[a-z]/.test(pw)) score += 10;
    if (/[A-Z]/.test(pw)) score += 10;
    if (/[0-9]/.test(pw)) score += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 15;
    if (/(.)\1\1/.test(pw)) score -= 15; // repeated chars
    if (/^(123|abc|qwerty|password|admin|argaman)/i.test(pw)) score -= 30;
    score = Math.max(0, Math.min(100, score));
    let label, color;
    if (score < 30) { label = 'חלשה מאוד'; color = '#dc2626'; }
    else if (score < 50) { label = 'חלשה'; color = '#f59e0b'; }
    else if (score < 70) { label = 'בינונית'; color = '#eab308'; }
    else if (score < 90) { label = 'חזקה'; color = '#22c55e'; }
    else { label = 'חזקה מאוד'; color = '#16a34a'; }
    return { score, label, color };
  }

  /* ---------- Rate limiter ---------- */
  // Tracks failed login attempts in localStorage. Locks for 15 min after 5 fails.
  const RL_KEY = 'argaman_login_attempts';
  function getAttempts(){
    try { return JSON.parse(localStorage.getItem(RL_KEY) || '{"count":0,"lockUntil":0}'); }
    catch { return { count: 0, lockUntil: 0 }; }
  }
  function recordFailedLogin(){
    const a = getAttempts();
    a.count = (a.count || 0) + 1;
    if (a.count >= 5) {
      a.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
    }
    localStorage.setItem(RL_KEY, JSON.stringify(a));
    return a;
  }
  function recordSuccessfulLogin(){
    localStorage.setItem(RL_KEY, JSON.stringify({ count: 0, lockUntil: 0 }));
  }
  function isLockedOut(){
    const a = getAttempts();
    if (a.lockUntil && a.lockUntil > Date.now()) {
      return { locked: true, remainingMs: a.lockUntil - Date.now(), attempts: a.count };
    }
    if (a.lockUntil && a.lockUntil <= Date.now()) {
      // Lock expired — reset
      localStorage.setItem(RL_KEY, JSON.stringify({ count: 0, lockUntil: 0 }));
    }
    return { locked: false, attempts: a.count };
  }

  /* ---------- Session timeout ---------- */
  // Idle: 30min, Absolute max: 8h
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
  let lastActivity = Date.now();
  let sessionStarted = Date.now();
  let idleTimer = null;
  let onTimeoutCb = null;

  function touchSession(){ lastActivity = Date.now(); }
  function startSessionMonitor(onTimeout){
    sessionStarted = Date.now();
    lastActivity = Date.now();
    onTimeoutCb = onTimeout;
    ['mousemove','keydown','click','touchstart','scroll'].forEach(ev =>
      document.addEventListener(ev, touchSession, { passive: true })
    );
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(() => {
      const idleFor = Date.now() - lastActivity;
      const totalFor = Date.now() - sessionStarted;
      if (idleFor > IDLE_TIMEOUT_MS) {
        stopSessionMonitor();
        if (onTimeoutCb) onTimeoutCb('idle');
      } else if (totalFor > ABSOLUTE_TIMEOUT_MS) {
        stopSessionMonitor();
        if (onTimeoutCb) onTimeoutCb('absolute');
      }
    }, 30000); // check every 30 seconds
  }
  function stopSessionMonitor(){
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
  }

  /* ---------- Audit log ---------- */
  function auditLog(action, details){
    const entry = {
      at: new Date().toISOString(),
      action,
      details: details || '',
      ua: navigator.userAgent.slice(0, 120)
    };
    try {
      const key = 'argaman_audit_log';
      const log = JSON.parse(localStorage.getItem(key) || '[]');
      log.unshift(entry);
      // Keep last 500 entries
      const trimmed = log.slice(0, 500);
      localStorage.setItem(key, JSON.stringify(trimmed));
      return entry;
    } catch (e) {
      console.error('[SEC] Audit log write failed:', e);
    }
  }
  function getAuditLog(){
    try { return JSON.parse(localStorage.getItem('argaman_audit_log') || '[]'); }
    catch { return []; }
  }
  function clearAuditLog(){
    if (confirm('למחוק את כל יומן הביקורת? פעולה בלתי הפיכה.')) {
      localStorage.removeItem('argaman_audit_log');
      return true;
    }
    return false;
  }

  /* ---------- Sanitization helper ---------- */
  function sanitizeHTML(s){
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- DEK / Key Wrapping (for password recovery) ----------
     Architecture:
     - DEK = Data Encryption Key (random AES-256, encrypts all data)
     - KEK_pw = Key derived from password (wraps DEK)
     - KEK_rc = Key derived from recovery code (wraps DEK)
     Stored: wrappedDEK_pw, wrappedDEK_rc.
     Either password OR recovery code can unwrap DEK.
  */

  // Generate a random 256-bit Data Encryption Key
  async function generateDEK(){
    const key = await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable so we can wrap it
      ['encrypt', 'decrypt']
    );
    return key;
  }

  // Export DEK to raw bytes (for wrapping)
  async function exportDEKRaw(dek){
    const raw = await subtle.exportKey('raw', dek);
    return new Uint8Array(raw);
  }

  // Import DEK from raw bytes (extractable — needed for re-wrapping with recovery codes)
  async function importDEKRaw(rawBytes){
    return await subtle.importKey(
      'raw', rawBytes,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Wrap DEK using a KEK (from password or recovery code)
  async function wrapDEK(dek, kek){
    const raw = await exportDEKRaw(dek);
    const iv = randomBytes(12);
    const cipher = await subtle.encrypt({ name:'AES-GCM', iv }, kek, raw);
    return { iv: bufToB64(iv), cipher: bufToB64(cipher) };
  }

  // Unwrap DEK with KEK; returns AES-GCM CryptoKey
  async function unwrapDEK(wrapped, kek){
    try {
      const iv = new Uint8Array(b64ToBuf(wrapped.iv));
      const cipher = b64ToBuf(wrapped.cipher);
      const raw = await subtle.decrypt({ name:'AES-GCM', iv }, kek, cipher);
      return await importDEKRaw(new Uint8Array(raw));
    } catch (e){
      throw new Error('כשל בפענוח מפתח — סיסמה/קוד שחזור שגויים');
    }
  }

  /**
   * Generate a recovery code in human-friendly format:
   * 4 groups of 6 chars from alphabet without ambiguous chars (no 0/O/1/I/l).
   * Example: "K7BX-MP9R-NY4Q-HZW3"
   */
  function generateRecoveryCode(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const groups = [];
    for (let g = 0; g < 4; g++){
      const rnd = randomBytes(6);
      let s = '';
      for (let i = 0; i < 6; i++) s += chars[rnd[i] % chars.length];
      groups.push(s);
    }
    return groups.join('-');
  }

  function normalizeRecoveryCode(code){
    return (code||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,6}/g)?.join('-') || '';
  }

  /* ---------- Export ---------- */
  global.ArgSec = {
    generateDEK, exportDEKRaw, importDEKRaw, wrapDEK, unwrapDEK,
    generateRecoveryCode, normalizeRecoveryCode,
    // Crypto
    deriveEncKey,
    encrypt, decrypt,
    encryptJSON, decryptJSON,
    hashPassword, verifyPassword,
    // Password helpers
    generatePassword, passwordStrength,
    // Rate limiting
    recordFailedLogin, recordSuccessfulLogin, isLockedOut,
    // Session
    startSessionMonitor, stopSessionMonitor, touchSession,
    IDLE_TIMEOUT_MS, ABSOLUTE_TIMEOUT_MS,
    // Audit
    auditLog, getAuditLog, clearAuditLog,
    // Helpers
    sanitizeHTML,
    // Constants
    PBKDF2_ITERATIONS
  };
})(typeof window !== 'undefined' ? window : globalThis);
