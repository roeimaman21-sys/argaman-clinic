/* =====================================================
   dsar-export.js — Data Subject Access Request Export
   תיקון 13 compliance — זכות עיון של הלקוח
   ===================================================== */
(function(){
  'use strict';

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /** Open a confirmation + export modal for a client */
  async function openDSARModal(clientId){
    const State = window.State;
    if (!State){ window.toast?.('State לא זמין','error'); return; }
    const client = (State.clients || []).find(c => c.id === clientId);
    if (!client){ window.toast?.('לקוח לא נמצא','error'); return; }

    // Aggregate the data
    const sessions = (State.sessions || []).filter(s => s.clientId === clientId);
    const outcomes = (State.outcomes || []).filter(o => o.clientId === clientId);
    const risks = (State.risk_assessments || []).filter(r => r.clientId === clientId);
    const treatmentPlans = (State.treatment_plans || []).filter(p => p.clientId === clientId);
    const documents = client.documents || [];

    const html = `
      <div class="modal-content" style="max-width:550px">
        <h2 style="color:var(--navy);margin-bottom:.75rem">📋 DSAR — ייצוא מידע אישי</h2>
        <p style="color:#374151;font-size:.9rem;margin-bottom:.75rem">
          <strong>${escapeHtml(client.name||'(ללא שם)')}</strong> מבקש/ת לקבל את כל המידע שמוחזק עליו/ה.
        </p>
        <div style="background:#dbeafe;border-right:4px solid #2563eb;padding:.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:.85rem;color:#1e3a8a">
          <strong>תקנה:</strong> תיקון 13 לחוק הגנת הפרטיות מחייב מענה תוך 30 יום. הייצוא יבוצע מיד.
        </div>
        <h3 style="font-size:.95rem;margin-bottom:.5rem">מידע שיכלל בייצוא:</h3>
        <div style="background:#f9fafb;padding:.75rem;border-radius:6px;font-size:.85rem;line-height:1.8">
          📄 פרופיל לקוח (שם, טלפון, אימייל, סטטוס, הערות)<br>
          📅 ${sessions.length} פגישות (כולל רשומות SOAP)<br>
          📊 ${outcomes.length} מדדי outcome (PHQ-9 / GAD-7 / ...)<br>
          ⚠️ ${risks.length} הערכות סיכון<br>
          🎯 ${treatmentPlans.length} תוכניות טיפול<br>
          📎 ${documents.length} מסמכים מצורפים<br>
          📋 רישומים מ-audit log הקשורים ללקוח
        </div>
        <div style="margin:1rem 0">
          <label style="display:flex;align-items:center;gap:.5rem;font-size:.85rem">
            <input type="checkbox" id="dsar-verified"> אימתתי את זהות הלקוח (4 ספרות אחרונות של ת.ז + סיסמת חתימה ראשונית)
          </label>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button class="btn" onclick="closeModal()">ביטול</button>
          <button class="btn btn-gold" id="dsar-export-btn" onclick="window.runDSARExport('${clientId}')">📦 ייצא ל-JSON</button>
        </div>
      </div>`;
    window.modal(html);
  }

  /** Aggregate all data for a client into a JSON object */
  function aggregateClientData(clientId){
    const State = window.State || {};
    const client = (State.clients || []).find(c => c.id === clientId);
    if (!client) return null;

    const sessions = (State.sessions || []).filter(s => s.clientId === clientId);
    const outcomes = (State.outcomes || []).filter(o => o.clientId === clientId);
    const risks = (State.risk_assessments || []).filter(r => r.clientId === clientId);
    const treatmentPlans = (State.treatment_plans || []).filter(p => p.clientId === clientId);

    return {
      __meta: {
        type: 'DSAR Export',
        legal_basis: 'תיקון 13 — זכות עיון',
        client_id: clientId,
        client_name: client.name,
        exported_at: new Date().toISOString(),
        exported_by: window.CURRENT_USER_DISPLAY_NAME || 'unknown',
        format_version: '1.0',
        site: 'argamanclinic.com',
        notice: 'מסמך זה מכיל מידע אישי רגיש. יש לטפל בו בהתאם להנחיות פרטיות.'
      },
      profile: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        status: client.status,
        type: client.type,
        startDate: client.startDate,
        notes: client.notes || [],
        tags: client.tags || []
      },
      sessions: sessions.map(s => ({
        id: s.id,
        date: s.date,
        time: s.time,
        status: s.status,
        paid: s.paid,
        price: s.price,
        title: s.title,
        notes: s.notes,
        soapNotes: s.soapNotes || s.notesData || null,
        location: s.location
      })),
      outcomes: outcomes,
      risk_assessments: risks,
      treatment_plans: treatmentPlans
    };
  }

  /** Fetch audit log entries related to this client from Supabase */
  async function fetchAuditEntries(clientId, clientName){
    if (!window.supa) return [];
    try {
      const { data } = await window.supa
        .from('argaman_action_log')
        .select('action, entity_type, entity_label, created_at, user_email')
        .or(`entity_id.eq.${clientId},entity_label.ilike.%${clientName}%`)
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    } catch(_){ return []; }
  }

  /** Fetch consent records */
  async function fetchConsents(clientId){
    if (!window.supa) return [];
    try {
      const { data } = await window.supa
        .from('argaman_consents')
        .select('signed_at, consent_text_version, consent_text_hash, this_hash')
        .eq('client_id', clientId)
        .order('signed_at', { ascending: true });
      return data || [];
    } catch(_){ return []; }
  }

  window.runDSARExport = async function(clientId){
    const verified = document.getElementById('dsar-verified')?.checked;
    if (!verified){ window.toast?.('יש לאמת את זהות הלקוח לפני הייצוא','error'); return; }
    const btn = document.getElementById('dsar-export-btn');
    btn.disabled = true; btn.textContent = 'אוסף...';
    try {
      // 1) Aggregate local state
      const payload = aggregateClientData(clientId);
      if (!payload){ window.toast?.('לקוח לא נמצא','error'); return; }

      // 2) Fetch server-side data
      btn.textContent = 'מושך מ-Supabase...';
      const [auditEntries, consents] = await Promise.all([
        fetchAuditEntries(clientId, payload.profile.name),
        fetchConsents(clientId)
      ]);
      payload.audit_log = auditEntries;
      payload.consents = consents;

      // 3) Stats
      payload.__meta.stats = {
        sessions_count: payload.sessions.length,
        outcomes_count: payload.outcomes.length,
        risk_assessments_count: payload.risk_assessments.length,
        treatment_plans_count: payload.treatment_plans.length,
        audit_entries_count: auditEntries.length,
        consents_count: consents.length
      };

      // 4) Download
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (payload.profile.name || 'client').replace(/[^a-zA-Z֐-׿0-9_\-]/g, '_');
      a.download = `DSAR-${safeName}-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // 5) Audit
      try { window.Audit?.logAction('dsar_export', 'client', clientId, payload.profile.name); } catch(_){}

      // 6) Track in DSAR requests table for 30-day deadline (תיקון 13)
      try {
        if (window.supa){
          await window.supa.from('argaman_dsar_requests').insert({
            client_id: clientId,
            client_name: payload.profile.name,
            request_type: 'access',
            completed_at: new Date().toISOString(),
            notes: `Auto-exported by ${window.CURRENT_USER_DISPLAY_NAME || 'owner'}`
          });
        }
      } catch(e){ console.warn('DSAR tracking failed:', e); }

      window.toast?.('✅ DSAR יוצא בהצלחה. מסור ללקוח עם הסבר.','success');
      window.closeModal?.();
    } catch(e){
      console.error('DSAR error:', e);
      window.toast?.('שגיאה: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = '📦 ייצא ל-JSON';
    }
  };

  window.DSAR = { open: openDSARModal, aggregate: aggregateClientData };
  window.openDSARExport = openDSARModal;
})();
