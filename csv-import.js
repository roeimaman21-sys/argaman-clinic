/* =====================================================
   csv-import.js — Import leads/clients from CSV file
   ===================================================== */
(function(){
  'use strict';

  function parseCSV(text){
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];
    // Detect delimiter
    const firstLine = lines[0];
    const delim = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');
    const parseRow = (line) => {
      const out = [];
      let cur = '', inQuotes = false;
      for (let i = 0; i < line.length; i++){
        const c = line[i];
        if (inQuotes){
          if (c === '"' && line[i+1] === '"'){ cur += '"'; i++; }
          else if (c === '"') inQuotes = false;
          else cur += c;
        } else {
          if (c === '"') inQuotes = true;
          else if (c === delim){ out.push(cur); cur = ''; }
          else cur += c;
        }
      }
      out.push(cur);
      return out.map(s => s.trim());
    };
    const headers = parseRow(lines[0]).map(h => h.toLowerCase());
    const rows = lines.slice(1).map(parseRow);
    return rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i] || '');
      return obj;
    });
  }

  // Heuristic mapping — common Hebrew + English column names
  const COL_MAP = {
    name:   ['שם','שם מלא','name','full name','first name','שם פרטי'],
    phone:  ['טלפון','phone','mobile','נייד','phone number','tel'],
    email:  ['אימייל','מייל','email','e-mail'],
    source: ['מקור','source','origin'],
    topic:  ['נושא','topic','category','reason'],
    notes:  ['הערות','notes','comment','remarks']
  };

  function detectColumn(headers, candidates){
    for (const c of candidates){
      const lower = c.toLowerCase();
      const found = headers.findIndex(h => h.toLowerCase().includes(lower));
      if (found >= 0) return headers[found];
    }
    return null;
  }

  function showImportDialog(){
    const html = `
      <div class="modal-content" style="max-width:600px">
        <h2 style="color:var(--navy);margin-bottom:1rem">📥 ייבוא לידים מ-CSV</h2>
        <div style="background:#dbeafe;border-right:4px solid #2563eb;padding:.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:.85rem;color:#1e3a8a">
          <strong>איך זה עובד:</strong>
          <ol style="margin:.3rem 0 0;padding-right:1.2rem">
            <li>הכנו קובץ CSV עם עמודות: שם, טלפון, אימייל, מקור, נושא, הערות</li>
            <li>שורה ראשונה — כותרות (Hebrew או English)</li>
            <li>תווי הפרדה: פסיק, ; או טאב</li>
          </ol>
        </div>
        <input type="file" id="csv-file" accept=".csv,.txt" style="width:100%;padding:.6rem;border:1px solid #d1d5db;border-radius:6px;margin-bottom:.75rem">
        <div id="csv-preview" style="display:none;background:#f9fafb;padding:.75rem;border-radius:6px;margin-bottom:.75rem;font-size:.85rem;max-height:200px;overflow:auto"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="btn" onclick="closeModal()">ביטול</button>
          <button class="btn btn-gold" id="csv-import-btn" style="display:none" onclick="performCSVImport()">ייבא</button>
        </div>
      </div>`;
    modal(html);
    document.getElementById('csv-file').addEventListener('change', previewCSV);
  }

  let _parsedRows = [];
  function previewCSV(e){
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        _parsedRows = parseCSV(ev.target.result);
        if (_parsedRows.length === 0){
          document.getElementById('csv-preview').innerHTML = '<div style="color:#dc2626">קובץ ריק או לא תקין</div>';
          return;
        }
        const headers = Object.keys(_parsedRows[0]);
        const mapping = {
          name: detectColumn(headers, COL_MAP.name),
          phone: detectColumn(headers, COL_MAP.phone),
          email: detectColumn(headers, COL_MAP.email),
          source: detectColumn(headers, COL_MAP.source),
          topic: detectColumn(headers, COL_MAP.topic),
          notes: detectColumn(headers, COL_MAP.notes)
        };
        const preview = document.getElementById('csv-preview');
        preview.style.display = 'block';
        preview.innerHTML = `
          <strong>זוהו ${_parsedRows.length} שורות</strong>
          <div style="margin-top:.5rem;display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.8rem">
            <div><strong>שם →</strong> ${mapping.name||'(לא נמצא)'}</div>
            <div><strong>טלפון →</strong> ${mapping.phone||'(לא נמצא)'}</div>
            <div><strong>אימייל →</strong> ${mapping.email||'(לא נמצא)'}</div>
            <div><strong>מקור →</strong> ${mapping.source||'אחר (ברירת מחדל)'}</div>
            <div><strong>נושא →</strong> ${mapping.topic||'(לא נמצא)'}</div>
            <div><strong>הערות →</strong> ${mapping.notes||'(לא נמצא)'}</div>
          </div>
          ${_parsedRows.slice(0,3).length ? `<div style="margin-top:.5rem"><strong>3 שורות ראשונות:</strong><pre style="font-size:.75rem;margin-top:.3rem;background:#fff;padding:.3rem;overflow:auto">${JSON.stringify(_parsedRows.slice(0,3), null, 2)}</pre></div>` : ''}
        `;
        _parsedRows.__mapping = mapping;
        document.getElementById('csv-import-btn').style.display = 'inline-block';
      } catch(err){
        document.getElementById('csv-preview').innerHTML = `<div style="color:#dc2626">שגיאה: ${err.message}</div>`;
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  window.performCSVImport = function(){
    const State = window.State;
    if (!State) return;
    const m = _parsedRows.__mapping || {};
    if (!m.name && !m.phone){ window.toast('חסר עמודת שם או טלפון','error'); return; }
    let added = 0, skipped = 0;
    _parsedRows.forEach(row => {
      const name = m.name ? row[m.name] : '';
      const phone = m.phone ? row[m.phone] : '';
      if (!name && !phone){ skipped++; return; }
      // Dedup: skip if phone matches existing lead
      if (phone && State.leads.some(l => (l.phone||'').replace(/[^0-9]/g,'') === phone.replace(/[^0-9]/g,''))){
        skipped++; return;
      }
      State.leads.push({
        id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
        createdAt: new Date().toISOString(),
        name: name || phone,
        phone, email: m.email ? row[m.email] : '',
        source: m.source ? row[m.source] : 'אחר',
        topic: m.topic ? row[m.topic] : '',
        status: 'new',
        notes: m.notes && row[m.notes] ? [{ date: new Date().toISOString(), text: row[m.notes] + ' (יובא מ-CSV)' }] : []
      });
      added++;
    });
    if (typeof window.save === 'function' && window.LS) window.save(window.LS.leads, State.leads);
    window.toast(`✅ נוספו ${added} לידים (${skipped} דולגו - כפילויות)`, 'success');
    if (typeof window.logActivity === 'function') window.logActivity(`יובאו ${added} לידים מ-CSV`);
    if (window.closeModal) window.closeModal();
    if (window.renderers && window.currentSection) {
      try { window.renderers[window.currentSection](); window.updateBadges?.(); } catch(_){}
    }
  };

  window.openCSVImport = showImportDialog;
})();
