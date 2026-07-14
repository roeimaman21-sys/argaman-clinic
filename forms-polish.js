/* =====================================================
   forms-polish.js — Forms Excellence (A14)
   Autosave drafts · inline validation · helper text · shake on error
   ===================================================== */
(function(){
  'use strict';
  if (window.__argamanFormsInit) return;
  window.__argamanFormsInit = true;

  const STORAGE_PREFIX = 'argaman_form_draft_';
  const MAX_AGE_DAYS = 7;

  // ─── Validators ─────────────────────────────────
  const validators = {
    name(v){
      if (!v.trim()) return 'נא להזין שם';
      if (v.trim().length < 2) return 'שם קצר מדי';
      return '';
    },
    phone(v){
      const cleaned = v.replace(/[\s-]/g, '');
      if (!cleaned) return 'נא להזין טלפון';
      if (!/^(05\d{8}|0[2-9]\d{7,8}|\+9725\d{8})$/.test(cleaned)) {
        return 'מספר טלפון לא תקין · 050-1234567';
      }
      return '';
    },
    email(v){
      if (!v) return ''; // optional
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'כתובת מייל לא תקינה';
      return '';
    },
    checkbox(el){
      if (el.required && !el.checked) return 'נדרש לאשר';
      return '';
    }
  };

  function fieldError(field, msg){
    const wrap = field.closest('.form-group') || field.parentElement;
    let helper = wrap.querySelector('.form-helper');
    if (!helper){
      helper = document.createElement('p');
      helper.className = 'form-helper';
      wrap.appendChild(helper);
    }
    if (msg){
      helper.textContent = msg;
      helper.classList.add('is-error');
      field.classList.add('is-invalid');
      field.setAttribute('aria-invalid', 'true');
      if (!field.getAttribute('aria-describedby')){
        const id = `helper-${Math.random().toString(36).slice(2,8)}`;
        helper.id = id;
        field.setAttribute('aria-describedby', id);
      }
    } else {
      helper.textContent = '';
      helper.classList.remove('is-error');
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
    }
  }

  function validateField(field){
    const v = field.value;
    let err = '';
    if (field.type === 'checkbox') err = validators.checkbox(field);
    else if (field.id === 'contact-name' || field.name === 'name') err = validators.name(v);
    else if (field.type === 'tel' || field.name === 'phone') err = validators.phone(v);
    else if (field.type === 'email') err = validators.email(v);
    else if (field.required && !v.trim()) err = 'שדה חובה';
    fieldError(field, err);
    return !err;
  }

  // ─── Autosave drafts ──────────────────────────
  function draftKey(form){
    return STORAGE_PREFIX + (form.id || 'unnamed');
  }
  function saveDraft(form){
    try {
      const data = {};
      form.querySelectorAll('input,textarea,select').forEach(el => {
        if (el.type === 'hidden' || el.name?.startsWith('_') || el.name === '_honey') return;
        if (el.type === 'password') return;
        if (el.type === 'checkbox') data[el.name || el.id] = el.checked;
        else data[el.name || el.id] = el.value;
      });
      localStorage.setItem(draftKey(form), JSON.stringify({ data, ts: Date.now() }));
      showDraftBadge(form);
    } catch(_){}
  }
  function loadDraft(form){
    try {
      const raw = localStorage.getItem(draftKey(form));
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      const age = (Date.now() - ts) / 86400000;
      if (age > MAX_AGE_DAYS) {
        localStorage.removeItem(draftKey(form));
        return null;
      }
      return data;
    } catch(_) { return null; }
  }
  function clearDraft(form){
    try { localStorage.removeItem(draftKey(form)); } catch(_){}
  }

  function showDraftBadge(form){
    let badge = form.querySelector('.form-draft-saved');
    if (!badge){
      badge = document.createElement('div');
      badge.className = 'form-draft-saved';
      badge.setAttribute('aria-live', 'polite');
      badge.innerHTML = '<span aria-hidden="true">💾</span> שמרנו את הטיוטה';
      form.insertBefore(badge, form.firstChild);
    }
    badge.classList.remove('is-visible');
    void badge.offsetWidth;
    badge.classList.add('is-visible');
    clearTimeout(badge._t);
    badge._t = setTimeout(() => badge.classList.remove('is-visible'), 2200);
  }

  function showRestoreBanner(form, applyFn){
    const banner = document.createElement('div');
    banner.className = 'form-restore-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <span><span aria-hidden="true">📝</span> מצאנו טיוטה שמורה</span>
      <span class="form-restore-actions">
        <button type="button" class="btn-restore">שחזרי</button>
        <button type="button" class="btn-restore-dismiss" aria-label="בטל">×</button>
      </span>
    `;
    form.insertBefore(banner, form.firstChild);
    banner.querySelector('.btn-restore').addEventListener('click', () => {
      applyFn();
      banner.remove();
    });
    banner.querySelector('.btn-restore-dismiss').addEventListener('click', () => {
      clearDraft(form);
      banner.remove();
    });
  }

  // ─── Init per form ─────────────────────────────
  function initForm(form){
    if (form.__argamanInited) return;
    form.__argamanInited = true;
    form.classList.add('argaman-form');

    // Helper text for known fields
    addHelpers(form);

    // Restore draft (offered, not forced)
    const draft = loadDraft(form);
    if (draft){
      showRestoreBanner(form, () => {
        Object.entries(draft).forEach(([k, v]) => {
          const el = form.querySelector(`[name="${k}"], #${k}`);
          if (!el) return;
          if (el.type === 'checkbox') el.checked = !!v;
          else el.value = v;
        });
      });
    }

    // Save on blur, validate on blur
    const fields = form.querySelectorAll('input,textarea,select');
    fields.forEach(field => {
      if (field.type === 'hidden' || field.name?.startsWith('_')) return;

      field.addEventListener('blur', () => {
        validateField(field);
        saveDraft(form);
      });
      // Clear error as user re-types
      field.addEventListener('input', () => {
        if (field.classList.contains('is-invalid')) {
          fieldError(field, '');
        }
      });
    });

    // Submit: validate all, shake on failure
    form.addEventListener('submit', (e) => {
      let ok = true;
      const required = form.querySelectorAll('[required]');
      required.forEach(f => {
        if (!validateField(f)) ok = false;
      });
      // Also validate optional email if filled
      const email = form.querySelector('input[type="email"]');
      if (email && email.value && !validateField(email)) ok = false;

      if (!ok){
        e.preventDefault();
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        // Focus first invalid
        const firstBad = form.querySelector('.is-invalid');
        if (firstBad) firstBad.focus();
      } else {
        clearDraft(form);
        document.dispatchEvent(new CustomEvent('argaman:form-success', { detail: { form } }));
      }
    });
  }

  function addHelpers(form){
    const map = {
      'contact-phone':  'פורמט: 050-1234567',
      'contact-email':  'לא חובה — אם רוצים מענה במייל',
      'contact-name':   'איך אפשר לפנות אליך?',
      'contact-message':'אפשר לשלוח גם אחרי שתאמרו "שלום"'
    };
    Object.entries(map).forEach(([id, text]) => {
      const field = form.querySelector(`#${id}`);
      if (!field) return;
      const wrap = field.closest('.form-group') || field.parentElement;
      if (wrap.querySelector('.form-hint')) return;
      const hint = document.createElement('p');
      hint.className = 'form-hint';
      hint.textContent = text;
      wrap.appendChild(hint);
    });
  }

  // ─── Wire up on DOMReady ───────────────────────
  function init(){
    document.querySelectorAll('form#contact-form, form[data-argaman-enhance]').forEach(initForm);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
