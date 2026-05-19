/* =====================================================
   hebrew-search.js — Client-side full-text search in Hebrew
   Cmd+K palette + result highlighting
   ===================================================== */
(function(){
  'use strict';

  /** Normalize Hebrew text for fuzzy matching (strip nikud, lowercase) */
  function normalize(s){
    return String(s||'')
      .replace(/[֑-ׇ]/g, '') // strip nikud
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /** Build a search index from State */
  function buildIndex(){
    const State = window.State || {};
    const index = [];
    // Leads
    (State.leads || []).forEach(l => {
      const haystack = [l.name, l.phone, l.email, l.topic, l.source, ...(l.tags || []),
        ...(l.notes || []).map(n => n.text)].filter(Boolean).join(' ');
      index.push({
        type: 'lead', id: l.id, label: l.name || '(ללא שם)',
        sub: `🎯 ליד · ${l.phone || ''} · ${l.status || ''}`,
        haystack: normalize(haystack),
        original: haystack,
        onClick: `viewLead('${l.id}')`
      });
    });
    // Clients
    (State.clients || []).forEach(c => {
      const haystack = [c.name, c.phone, c.email, c.notes_text, ...(c.tags || [])].filter(Boolean).join(' ');
      index.push({
        type: 'client', id: c.id, label: c.name || '(ללא שם)',
        sub: `👤 לקוח · ${c.phone || ''} · ${c.status || ''}`,
        haystack: normalize(haystack),
        original: haystack,
        onClick: `viewClient('${c.id}')`
      });
    });
    // Sessions
    (State.sessions || []).forEach(s => {
      const client = (State.clients || []).find(c => c.id === s.clientId);
      const soapText = s.soapNotes ? Object.values(s.soapNotes).join(' ') : (s.notesData || '');
      const haystack = [s.date, s.title, soapText, client?.name].filter(Boolean).join(' ');
      index.push({
        type: 'session', id: s.id, label: `${s.date} · ${client?.name || ''}`,
        sub: `📅 פגישה · ${s.time || ''}`,
        haystack: normalize(haystack),
        original: haystack,
        onClick: `editSession && editSession('${s.id}')`
      });
    });
    // Articles
    (State.articles || []).forEach(a => {
      const haystack = [a.title, a.description, a.tags].filter(Boolean).join(' ');
      index.push({
        type: 'article', id: a.id, label: a.title || '(ללא כותרת)',
        sub: `📝 מאמר`,
        haystack: normalize(haystack),
        original: haystack,
        onClick: `editArticle && editArticle('${a.id}')`
      });
    });
    // FAQs
    (State.faqs || []).forEach(f => {
      const haystack = [f.q, f.a].filter(Boolean).join(' ');
      index.push({
        type: 'faq', id: f.id, label: f.q || '(שאלה)',
        sub: '❓ FAQ',
        haystack: normalize(haystack),
        original: haystack,
        onClick: `goto('faqs')`
      });
    });
    return index;
  }

  /** Search the index with multi-token AND match */
  function search(query, index){
    if (!query) return [];
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return index
      .filter(item => tokens.every(t => item.haystack.includes(t)))
      .slice(0, 50); // cap at 50 results
  }

  /** Highlight matches in text */
  function highlight(text, query){
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return escapeHtml(text);
    let result = escapeHtml(text);
    tokens.forEach(t => {
      const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(re, '<mark style="background:#fef08a;color:#000;padding:0 2px;border-radius:2px">$1</mark>');
    });
    return result;
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  let _index = null;
  let _isOpen = false;
  let _selectedIdx = 0;
  let _currentResults = [];

  function openPalette(){
    if (_isOpen) return;
    _isOpen = true;
    _index = buildIndex();
    const overlay = document.createElement('div');
    overlay.id = 'hebrew-search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;justify-content:center;align-items:flex-start;padding-top:10vh;backdrop-filter:blur(4px)';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="חיפוש מהיר" style="background:#fff;width:90%;max-width:620px;border-radius:12px;box-shadow:0 25px 50px rgba(0,0,0,.3);max-height:70vh;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:1rem 1.25rem;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:.75rem">
          <span style="font-size:1.25rem">🔍</span>
          <input id="hs-input" type="text" autocomplete="off" placeholder="חיפוש לידים, לקוחות, פגישות, מאמרים..." style="flex:1;border:0;font-size:1.05rem;outline:none;background:transparent" aria-label="שדה חיפוש">
          <kbd style="font-size:.7rem;padding:.2rem .4rem;background:#f3f4f6;border-radius:4px;color:#6b7280">Esc</kbd>
        </div>
        <div id="hs-results" style="overflow-y:auto;flex:1;padding:.5rem"></div>
        <div style="padding:.5rem 1rem;border-top:1px solid #f3f4f6;display:flex;gap:1rem;font-size:.7rem;color:#9ca3af">
          <span><kbd>↑↓</kbd> ניווט</span>
          <span><kbd>Enter</kbd> בחר</span>
          <span><kbd>Esc</kbd> סגור</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    const input = document.getElementById('hs-input');
    input.focus();
    input.addEventListener('input', () => renderResults(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){ e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown'){ e.preventDefault(); moveSelection(1); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); moveSelection(-1); }
      else if (e.key === 'Enter'){ e.preventDefault(); selectCurrent(); }
    });
    renderResults('');
  }

  function close(){
    document.getElementById('hebrew-search-overlay')?.remove();
    _isOpen = false;
    _selectedIdx = 0;
    _currentResults = [];
  }

  function moveSelection(delta){
    if (_currentResults.length === 0) return;
    _selectedIdx = (_selectedIdx + delta + _currentResults.length) % _currentResults.length;
    updateSelection();
  }

  function updateSelection(){
    document.querySelectorAll('.hs-result').forEach((el, i) => {
      el.style.background = i === _selectedIdx ? '#dbeafe' : '';
    });
    const sel = document.querySelectorAll('.hs-result')[_selectedIdx];
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function selectCurrent(){
    const r = _currentResults[_selectedIdx];
    if (!r) return;
    close();
    try {
      // eslint-disable-next-line no-new-func
      new Function(r.onClick)();
    } catch(e){ console.error('search action error:', e); }
  }

  function renderResults(query){
    const el = document.getElementById('hs-results');
    if (!el) return;
    if (!query.trim()){
      el.innerHTML = `<div style="text-align:center;padding:2rem 1rem;color:#9ca3af;font-size:.9rem">
        התחילו להקליד...<br>
        <span style="font-size:.75rem">חיפוש בלידים, לקוחות, פגישות, מאמרים ו-FAQ</span>
      </div>`;
      _currentResults = [];
      return;
    }
    const results = search(query, _index);
    _currentResults = results;
    _selectedIdx = 0;
    if (results.length === 0){
      el.innerHTML = `<div style="text-align:center;padding:2rem 1rem;color:#9ca3af">לא נמצאו תוצאות עבור "${escapeHtml(query)}"</div>`;
      return;
    }
    const typeColors = { lead:'#3b82f6', client:'#16a34a', session:'#a855f7', article:'#f59e0b', faq:'#0ea5e9' };
    el.innerHTML = results.map((r, i) => `
      <div class="hs-result" data-idx="${i}" role="button" tabindex="0" style="padding:.7rem .9rem;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:.5rem;${i===0?'background:#dbeafe':''}">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;color:#1f2937">${highlight(r.label, query)}</div>
          <div style="font-size:.78rem;color:#6b7280">${escapeHtml(r.sub)}</div>
        </div>
        <span style="font-size:.65rem;padding:.15rem .5rem;border-radius:50px;background:${typeColors[r.type]||'#9ca3af'};color:#fff;font-weight:700;white-space:nowrap">${r.type}</span>
      </div>
    `).join('');
    document.querySelectorAll('.hs-result').forEach(el => {
      el.addEventListener('click', () => { _selectedIdx = +el.dataset.idx; selectCurrent(); });
      el.addEventListener('mouseenter', () => { _selectedIdx = +el.dataset.idx; updateSelection(); });
    });
  }

  // Keyboard shortcut: Ctrl/Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      openPalette();
    }
  });

  window.HebrewSearch = { open: openPalette, close, search, normalize };
  window.openHebrewSearch = openPalette;
  // Override existing openFullSearch
  window.openFullSearch = openPalette;
})();
