/* =====================================================
   crm-extensions.js — Advanced Clinical Extensions
   קליניקת ארגמן · הרחבות קליניות מתקדמות
   ─────────────────────────────────────────────────────
   Modules:
   1. RiskAssessment    — C-SSRS, AUDIT, K10 (formal scored)
   2. MoreOutcomes      — ORS/SRS, DAS-7, PCL-5
   3. ResourcesLibrary  — file/link library, share with clients
   4. Genogram          — SVG family tree visualizer
   5. GoalTracker       — visual goal progress + library
   ===================================================== */
(function(){
  'use strict';

  function waitForState(attempts) {
    if (typeof State !== 'undefined') return start();
    if (attempts > 60) return console.warn('[CRMExtensions] State never appeared');
    setTimeout(() => waitForState(attempts+1), 250);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForState(0));
  } else {
    waitForState(0);
  }

  function start(){

  // ─── Helpers ───
  const $ = (s,r) => (r||document).querySelector(s);
  const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
  const esc = s => String(s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => 'x_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  const todayISO = () => new Date().toISOString().slice(0,10);
  const nowISO = () => new Date().toISOString();
  const fmt = d => { const x = new Date(d); return isNaN(x)?'—':x.toLocaleDateString('he-IL'); };
  const fmtDt = d => { const x = new Date(d); return isNaN(x)?'—':x.toLocaleString('he-IL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); };

  function getModal() {
    if (typeof openModal === 'function') return openModal;
    if (typeof modal === 'function') return (title, content, opts) => modal(content, Object.assign({ title, size:'lg' }, opts||{}));
    return (t,h) => alert(t + '\n' + (h||'').replace(/<[^>]+>/g,' ').slice(0,500));
  }
  function showToast(msg, type) {
    if (typeof toast === 'function') return toast(msg, type||'success');
    console.log('[CRMExtensions]', msg);
  }
  function closeModalSafe() {
    if (typeof closeModal === 'function') return closeModal();
    document.querySelectorAll('.modal-bg, .modal-backdrop, .modal-overlay').forEach(m => m.remove());
  }
  function audit(action, details) {
    if (window.CRMPlus?.Security?.log) return window.CRMPlus.Security.log(action, details);
    try {
      const log = (window.CRM ? window.CRM.ls.getJSON('argaman_audit_log',[]) : JSON.parse(localStorage.getItem('argaman_audit_log')||'[]'));
      log.push({ t: nowISO(), action, details: details||{} });
      localStorage.setItem('argaman_audit_log', JSON.stringify(log.slice(-1000)));
    } catch(e){}
  }

  // =====================================================
  // MODULE 1: RISK ASSESSMENT (C-SSRS, AUDIT, K10)
  // =====================================================
  const RiskAssessment = {
    LS: 'argaman_risk_assessments',

    instruments: {
      'C-SSRS': {
        title: 'Columbia Suicide Severity Rating Scale (C-SSRS)',
        desc: 'הערכת סיכון אובדנות — שאל את הלקוח בעדינות, באווירה לא שיפוטית',
        urgency: 'critical',
        questions: [
          { q: 'בחודש האחרון, האם משאלת המוות עברה במחשבותיך — שתעדיף שלא להיות חי, או שתרצה להירדם ולא להתעורר?', flag: 1 },
          { q: 'בחודש האחרון, האם היו לך מחשבות פעילות כלשהן על התאבדות?', flag: 2 },
          { q: 'בחודש האחרון, חשבת על איך אתה עשוי לעשות את זה — האם פיתחת תכנית? (אפילו חלקית?)', flag: 3 },
          { q: 'בחודש האחרון, האם היו לך מחשבות אובדניות עם כוונה כלשהי לפעול עליהן?', flag: 4 },
          { q: 'בחודש האחרון, האם פעלת על המחשבות (התחלת לארגן, הכנת אמצעים)?', flag: 5 },
          { q: 'בעבר — האם ניסית להתאבד או פגעת בעצמך בדרך כלשהי?', flag: 2 }
        ],
        options: ['לא','כן'],
        score: (answers) => {
          const yes = answers.filter(a => a === 1).length;
          let level = 'low', color = '#16a34a', action = 'מעקב רגיל';
          // Q3+ = moderate, Q4+ = high, Q5 = imminent
          if (answers[4] === 1) { level = 'דחוף'; color = '#dc2626'; action = '🚨 הפעל פרוטוקול חירום — אל תשאיר לבד, מד״א/קו לחיים, אשפוז'; }
          else if (answers[3] === 1) { level = 'גבוה'; color = '#ea580c'; action = '⚠️ הערכה פסיכיאטרית בתוך 24h, plan לבטיחות, יידוע משפחה'; }
          else if (answers[2] === 1) { level = 'בינוני'; color = '#f59e0b'; action = 'הערכה תוך שבוע, plan לבטיחות'; }
          else if (yes > 0) { level = 'נמוך-בינוני'; color = '#fbbf24'; action = 'מעקב צמוד, התקשרות בין פגישות'; }
          return { level, color, action, yes };
        }
      },
      'AUDIT': {
        title: 'Alcohol Use Disorders Identification Test (AUDIT)',
        desc: 'הערכת שימוש בעייתי באלכוהול',
        urgency: 'normal',
        questions: [
          { q: 'באיזו תכיפות אתה שותה משקה אלכוהולי?' },
          { q: 'כמה משקאות אתה צורך ביום שגרתי שאתה שותה?' },
          { q: 'באיזו תכיפות צרכת 6+ משקאות בהזדמנות אחת?' },
          { q: 'באיזו תכיפות בשנה האחרונה לא יכולת להפסיק לשתות אחרי שהתחלת?' },
          { q: 'באיזו תכיפות בשנה האחרונה האלכוהול גרם לך לא לעשות מה שציפו ממך?' },
          { q: 'באיזו תכיפות בשנה האחרונה היית צריך משקה ראשון בבוקר?' },
          { q: 'באיזו תכיפות בשנה האחרונה הרגשת אשמה אחרי השתייה?' },
          { q: 'באיזו תכיפות בשנה האחרונה לא יכולת לזכור מה היה אתמול בלילה?' },
          { q: 'האם אתה או מישהו אחר נפצעת בגלל השתייה שלך?' },
          { q: 'האם קרוב משפחה, חבר או רופא הציע שתפחית בשתייה?' }
        ],
        options: ['בכלל לא','חודשי או פחות','2-4 פעמים בחודש','2-3 פעמים בשבוע','4+ בשבוע'],
        score: (answers) => {
          const total = answers.reduce((a,b)=>a+b,0);
          let level, color, action;
          if (total < 8) { level = 'נמוך'; color = '#16a34a'; action = 'אין צורך בהתערבות מיוחדת'; }
          else if (total < 16) { level = 'מסוכן'; color = '#f59e0b'; action = 'התערבות קצרה מומלצת'; }
          else if (total < 20) { level = 'מזיק'; color = '#ea580c'; action = 'הפניה להתערבות ממוקדת'; }
          else { level = 'תלות אפשרית'; color = '#dc2626'; action = '🚨 הפניה לטיפול מתמחה באלכוהוליזם'; }
          return { level, color, action, total };
        }
      },
      'K10': {
        title: 'Kessler Psychological Distress Scale (K10)',
        desc: 'הערכת מצוקה פסיכולוגית כללית — 4 שבועות אחרונים',
        urgency: 'normal',
        questions: [
          { q: 'הרגשת עייפות ללא סיבה ברורה' },
          { q: 'הרגשת לחוץ/ה' },
          { q: 'הרגשת כל כך לחוץ/ה שכלום לא יכול היה להרגיע אותך' },
          { q: 'הרגשת חסר/ת תקווה' },
          { q: 'הרגשת חסר/ת שקט או "נסערת"' },
          { q: 'הרגשת חסר/ת מנוחה שלא יכולת לשבת בשקט' },
          { q: 'הרגשת מדוכא/ת' },
          { q: 'הרגשת שהכל הצריך מאמץ' },
          { q: 'הרגשת עצוב/ה כל כך עד שכלום לא יכול היה לעודד אותך' },
          { q: 'הרגשת חסר/ת ערך' }
        ],
        options: ['כל הזמן','רוב הזמן','חלק מהזמן','מעט מהזמן','בכלל לא'],
        scoreReverse: true,
        score: (answers) => {
          // Score 5-50 (each question 1-5, reversed)
          const total = answers.reduce((a,b)=>a+b,0);
          let level, color, action;
          if (total < 20) { level = 'מצוקה נמוכה'; color = '#16a34a'; action = 'אין צורך בהתערבות מיוחדת'; }
          else if (total < 25) { level = 'מצוקה קלה'; color = '#84cc16'; action = 'מעקב מומלץ'; }
          else if (total < 30) { level = 'מצוקה בינונית'; color = '#f59e0b'; action = 'התערבות טיפולית מומלצת'; }
          else { level = 'מצוקה גבוהה'; color = '#dc2626'; action = '⚠️ הערכה פסיכיאטרית מומלצת'; }
          return { level, color, action, total };
        }
      }
    },

    chooseInstrument(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return showToast('לקוח לא נמצא','error');
      const html = `
        <p>בחרו כלי הערכת סיכון עבור <strong>${esc(c.name||'')}</strong>:</p>
        <div style="display:flex;flex-direction:column;gap:.75rem;margin-top:1rem">
          ${Object.entries(this.instruments).map(([k,inst]) => `
            <button onclick="window.CRMExtensions.RiskAssessment.open('${clientId}','${k}')" style="background:#fff;border:2px solid ${inst.urgency==='critical'?'#dc2626':'#e5e7eb'};border-radius:12px;padding:1rem;cursor:pointer;text-align:right;font-family:inherit;transition:all .2s">
              <strong style="color:${inst.urgency==='critical'?'#dc2626':'#1B3A6B'}">${esc(k)} — ${esc(inst.title)}</strong>
              <p style="margin:.4rem 0 0;color:#6b7280;font-size:.85rem">${esc(inst.desc)}</p>
            </button>
          `).join('')}
        </div>
        <h3 style="color:#1B3A6B;margin-top:1.5rem">היסטוריית הערכות</h3>
        ${this._renderHistory(clientId)}
      `;
      getModal()('🚨 הערכת סיכון — ' + esc(c.name||''), html, { size:'lg' });
    },

    _renderHistory(clientId) {
      const all = JSON.parse(localStorage.getItem(this.LS)||'[]').filter(r => r.clientId === clientId).sort((a,b) => b.date.localeCompare(a.date));
      if (!all.length) return '<p style="color:#6b7280">אין הערכות קודמות</p>';
      return `<table style="width:100%;font-size:.85rem"><thead style="background:#f3f4f6"><tr><th style="padding:.4rem;text-align:right">תאריך</th><th>כלי</th><th>ציון</th><th>רמה</th></tr></thead>
      <tbody>${all.slice(0,10).map(r => `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.4rem">${fmtDt(r.date)}</td><td style="padding:.4rem"><strong>${esc(r.type)}</strong></td><td style="padding:.4rem;text-align:center">${r.score?.total ?? '—'}</td><td style="padding:.4rem;text-align:center"><span style="color:${r.score?.color||'#6b7280'};font-weight:700">${esc(r.score?.level||'—')}</span></td></tr>`).join('')}</tbody></table>`;
    },

    open(clientId, type) {
      const inst = this.instruments[type];
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!inst || !c) return showToast('שגיאה','error');
      const html = `
        <p style="background:${inst.urgency==='critical'?'#fee2e2':'#f3f4f6'};padding:.75rem;border-radius:8px;${inst.urgency==='critical'?'border-right:4px solid #dc2626':''}">
          <strong>${esc(c.name||'')}</strong> — ${esc(inst.desc)}
        </p>
        ${inst.urgency==='critical' ? '<div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:.75rem;border-radius:8px;margin:.5rem 0;font-size:.9rem">⚠️ <strong>חשוב:</strong> שאל בעדינות, ללא שיפוטיות. הנוכחות שלך — היא ההתערבות הראשונה.</div>' : ''}
        <div id="ra-questions" style="margin:1rem 0">
          ${inst.questions.map((qd,i) => `
            <div style="padding:.75rem;border-bottom:1px solid #f3f4f6">
              <div style="font-weight:600;margin-bottom:.5rem">${i+1}. ${esc(qd.q)}</div>
              <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                ${inst.options.map((opt,vi) => `
                  <label style="display:flex;align-items:center;gap:.25rem;padding:.4rem .75rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.85rem">
                    <input type="radio" name="raq${i}" value="${vi}" style="margin:0">
                    ${esc(opt)} <small style="color:#6b7280">(${vi})</small>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button onclick="window.CRMExtensions.closeModalSafe()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="window.CRMExtensions.RiskAssessment.save('${clientId}','${type}')" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">חשב ציון →</button>
        </div>
      `;
      getModal()(`🚨 ${type} — ${esc(c.name||'')}`, html, { size:'xl' });
    },

    save(clientId, type) {
      const inst = this.instruments[type];
      const answers = [];
      let missing = 0;
      inst.questions.forEach((_, i) => {
        const v = document.querySelector(`input[name="raq${i}"]:checked`);
        if (!v) missing++;
        else answers.push(inst.scoreReverse ? (inst.options.length - 1 - parseInt(v.value)) : parseInt(v.value));
      });
      if (missing > 0) return showToast(`חסרות ${missing} תשובות`,'error');
      const score = inst.score(answers);
      const record = { id: uid(), clientId, type, answers, score, date: nowISO() };
      const all = JSON.parse(localStorage.getItem(this.LS)||'[]');
      all.push(record);
      localStorage.setItem(this.LS, JSON.stringify(all));
      audit('risk_assessment_saved', { type, level: score.level, score: score.total });
      this._showResult(record, inst);
    },

    _showResult(r, inst) {
      const isCritical = r.score.level.includes('דחוף') || r.score.level.includes('גבוה');
      const html = `
        <div style="text-align:center;padding:1.5rem 1rem">
          ${r.score.total !== undefined ? `<div style="font-size:4rem;font-weight:800;color:${r.score.color};line-height:1">${r.score.total}</div>` : ''}
          <div style="display:inline-block;padding:.5rem 1.5rem;background:${r.score.color}22;color:${r.score.color};border-radius:50px;font-weight:700;font-size:1.1rem;margin-top:.5rem">${esc(r.score.level)}</div>
        </div>
        <div style="background:${isCritical?'#fee2e2':'#fef9e7'};border-right:4px solid ${r.score.color};padding:1rem;border-radius:8px;margin:1rem 0">
          <strong>פעולה מומלצת:</strong><br>${esc(r.score.action)}
        </div>
        ${isCritical ? `<div style="background:#fee2e2;padding:1rem;border-radius:8px;margin:1rem 0">
          <strong>📞 קווי חירום:</strong><br>
          • ער״ן: <a href="tel:1201">1201</a><br>
          • קו לחיים: <a href="tel:1800363363">1800-363-363</a><br>
          • מד״א: <a href="tel:101">101</a><br>
          • סה״ר (קטינים): <a href="tel:118">118</a>
        </div>` : ''}
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button onclick="window.CRMExtensions.closeModalSafe()" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">סיום</button>
        </div>
      `;
      getModal()('הערכת סיכון — תוצאה', html, { size:'md' });
    }
  };

  // =====================================================
  // MODULE 2: MORE OUTCOME MEASURES (ORS, DAS, PCL-5)
  // =====================================================
  const MoreOutcomes = {
    LS: 'argaman_outcomes',

    instruments: {
      'ORS': {
        title: 'Outcome Rating Scale (ORS)',
        desc: 'הערכת רווחה כללית — תן ציון על הסקאלה (0-10) לכל תחום',
        scaleMin: 0, scaleMax: 10,
        questions: [
          { q: 'אישית (תחושת רווחה אישית)', icon: '🧘' },
          { q: 'בין-אישית (קשרים קרובים)', icon: '👥' },
          { q: 'חברתית (עבודה, לימודים, חברים)', icon: '🏢' },
          { q: 'כללית (תחושת חיים בכלל)', icon: '🌍' }
        ],
        score: (answers) => {
          const total = answers.reduce((a,b)=>a+b,0);
          // Max = 40, clinical cutoff ~25
          let level, color;
          if (total >= 32) { level = 'רווחה גבוהה'; color = '#16a34a'; }
          else if (total >= 25) { level = 'רווחה בינונית'; color = '#84cc16'; }
          else if (total >= 18) { level = 'רווחה נמוכה'; color = '#f59e0b'; }
          else { level = 'מצוקה משמעותית'; color = '#dc2626'; }
          return { level, color, total, max: 40 };
        }
      },
      'DAS-7': {
        title: 'Dyadic Adjustment Scale — מקוצר (7 פריטים)',
        desc: 'איכות הקשר הזוגי — בהתייחס לשבועיים האחרונים',
        scaleMin: 0, scaleMax: 5,
        questions: [
          { q: 'באיזו תכיפות אתם מסכימים בענייני חיבה ואינטימיות?' },
          { q: 'באיזו תכיפות אתם מסכימים בענייני קבלת החלטות גדולות?' },
          { q: 'באיזו תכיפות אתם דנים בענייני גירושין או פרידה?' },
          { q: 'באיזו תכיפות הוויכוחים מסתיימים ברגשות פגועים?' },
          { q: 'האם אתם רבים ביחד יותר ממה שהייתם רוצים?' },
          { q: 'באיזו מידה אתם מאושרים מהקשר?' },
          { q: 'באיזו מידה אתם מצליחים לעבוד יחד כצוות?' }
        ],
        options: ['אף פעם','לעיתים רחוקות','לפעמים','לעיתים קרובות','כל הזמן','תמיד'],
        score: (answers) => {
          // Reverse score q3, q4, q5 (negative items)
          const adjusted = answers.map((a,i) => [2,3,4].includes(i) ? (5 - a) : a);
          const total = adjusted.reduce((a,b)=>a+b,0);
          let level, color;
          if (total >= 28) { level = 'איכות זוגית טובה'; color = '#16a34a'; }
          else if (total >= 21) { level = 'איכות זוגית בינונית'; color = '#84cc16'; }
          else if (total >= 14) { level = 'מצוקה זוגית'; color = '#f59e0b'; }
          else { level = 'מצוקה זוגית חמורה'; color = '#dc2626'; }
          return { level, color, total, max: 35 };
        }
      },
      'PCL-5': {
        title: 'PCL-5 — PTSD Checklist (DSM-5)',
        desc: 'תסמיני פוסט-טראומה — חודש אחרון. לכל פריט, באיזו מידה הוטרדת ממנו?',
        scaleMin: 0, scaleMax: 4,
        options: ['בכלל לא','מעט','בינוני','די הרבה','מאוד'],
        questions: [
          { q: 'זיכרונות חוזרים, לא רצויים ומציקים של האירוע' },
          { q: 'חלומות מציקים חוזרים על האירוע' },
          { q: 'תחושה שהאירוע קורה מחדש (flashback)' },
          { q: 'רגשות מצוקה כשמשהו מזכיר את האירוע' },
          { q: 'תגובה גופנית כשמשהו מזכיר את האירוע (דפיקות לב, נשימה)' },
          { q: 'הימנעות מזיכרונות, מחשבות ורגשות הקשורים לאירוע' },
          { q: 'הימנעות ממצבים חיצוניים שמזכירים את האירוע' },
          { q: 'קושי לזכור חלקים חשובים מהאירוע' },
          { q: 'אמונות שליליות חזקות על עצמך, אחרים או העולם' },
          { q: 'האשמת עצמך או אחרים על האירוע' },
          { q: 'רגשות שליליים חזקים: פחד, אימה, כעס, אשמה, בושה' },
          { q: 'איבוד עניין בפעילויות שנהנית מהן' },
          { q: 'תחושת ניתוק מאחרים' },
          { q: 'קושי לחוות רגשות חיוביים' },
          { q: 'התנהגות עצבנית, התפרצויות זעם' },
          { q: 'התנהגות חסרת אחריות או הרסנית' },
          { q: 'דריכות יתר, שמירה' },
          { q: 'תגובת בהלה מוגזמת (jumpy)' },
          { q: 'קושי בריכוז' },
          { q: 'קושי בשינה' }
        ],
        score: (answers) => {
          const total = answers.reduce((a,b)=>a+b,0);
          // PCL-5 cutoff for probable PTSD: 31-33
          let level, color;
          if (total < 20) { level = 'תסמינים מינימליים'; color = '#16a34a'; }
          else if (total < 33) { level = 'תסמינים בינוניים'; color = '#f59e0b'; }
          else if (total < 50) { level = 'PTSD סביר'; color = '#ea580c'; }
          else { level = 'PTSD חמור'; color = '#dc2626'; }
          return { level, color, total, max: 80 };
        }
      }
    },

    open(clientId, type) {
      const inst = this.instruments[type];
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!inst || !c) return showToast('שגיאה','error');

      // ORS is unique — slider 0-10
      if (type === 'ORS') return this._renderSliders(clientId, type, inst, c);

      // Others — radio buttons
      const html = `
        <p style="background:#f3f4f6;padding:.75rem;border-radius:8px"><strong>${esc(c.name||'')}</strong> — ${esc(inst.desc)}</p>
        <div id="mo-questions" style="margin:1rem 0">
          ${inst.questions.map((qd,i) => `
            <div style="padding:.75rem;border-bottom:1px solid #f3f4f6">
              <div style="font-weight:600;margin-bottom:.5rem">${i+1}. ${esc(qd.q)}</div>
              <div style="display:flex;gap:.3rem;flex-wrap:wrap">
                ${inst.options.map((opt,vi) => `
                  <label style="display:flex;align-items:center;gap:.25rem;padding:.3rem .6rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:50px;cursor:pointer;font-size:.8rem">
                    <input type="radio" name="moq${i}" value="${vi}" style="margin:0">
                    ${esc(opt)}
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end">
          <button onclick="window.CRMExtensions.closeModalSafe()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="window.CRMExtensions.MoreOutcomes.save('${clientId}','${type}')" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">חשב ציון →</button>
        </div>
      `;
      getModal()(`📊 ${type} — ${esc(c.name||'')}`, html, { size:'xl' });
    },

    _renderSliders(clientId, type, inst, c) {
      const html = `
        <p style="background:#f3f4f6;padding:.75rem;border-radius:8px"><strong>${esc(c.name||'')}</strong> — ${esc(inst.desc)}</p>
        ${inst.questions.map((qd,i) => `
          <div style="padding:1rem;border-bottom:1px solid #f3f4f6">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
              <strong>${qd.icon||''} ${esc(qd.q)}</strong>
              <span id="mo-val-${i}" style="font-size:1.5rem;font-weight:800;color:#1B3A6B;min-width:2rem;text-align:center">5</span>
            </div>
            <input type="range" id="mo-slider-${i}" min="0" max="10" value="5" step="0.1" style="width:100%" oninput="document.getElementById('mo-val-${i}').textContent = parseFloat(this.value).toFixed(1)">
            <div style="display:flex;justify-content:space-between;font-size:.75rem;color:#6b7280;margin-top:.25rem">
              <span>נמוך 0</span><span>10 גבוה</span>
            </div>
          </div>
        `).join('')}
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button onclick="window.CRMExtensions.closeModalSafe()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="window.CRMExtensions.MoreOutcomes.saveSliders('${clientId}','${type}')" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">שמור</button>
        </div>
      `;
      getModal()(`📊 ${type} — ${esc(c.name||'')}`, html, { size:'lg' });
    },

    saveSliders(clientId, type) {
      const inst = this.instruments[type];
      const answers = inst.questions.map((_, i) => parseFloat(document.getElementById(`mo-slider-${i}`).value));
      this._save(clientId, type, inst, answers);
    },

    save(clientId, type) {
      const inst = this.instruments[type];
      const answers = [];
      let missing = 0;
      inst.questions.forEach((_, i) => {
        const v = document.querySelector(`input[name="moq${i}"]:checked`);
        if (!v) missing++;
        else answers.push(parseInt(v.value));
      });
      if (missing > 0) return showToast(`חסרות ${missing} תשובות`,'error');
      this._save(clientId, type, inst, answers);
    },

    _save(clientId, type, inst, answers) {
      const score = inst.score(answers);
      const record = { id: uid(), clientId, type, total: score.total, max: score.max, band: score.level, color: score.color, answers, date: nowISO() };
      const all = JSON.parse(localStorage.getItem(this.LS)||'[]');
      all.push(record);
      localStorage.setItem(this.LS, JSON.stringify(all));
      audit('outcome_saved', { type, total: score.total, level: score.level });
      const html = `
        <div style="text-align:center;padding:2rem 1rem">
          <div style="font-size:4.5rem;font-weight:800;color:${score.color};line-height:1">${score.total.toFixed(score.total%1?1:0)}</div>
          <div style="color:#6b7280;margin-bottom:1rem">מתוך ${score.max}</div>
          <div style="display:inline-block;padding:.5rem 1.5rem;background:${score.color}22;color:${score.color};border-radius:50px;font-weight:700;font-size:1.1rem">${esc(score.level)}</div>
        </div>
        <div style="display:flex;gap:.5rem;justify-content:center;margin-top:1rem">
          <button onclick="window.CRMExtensions.closeModalSafe()" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">סיום</button>
        </div>
      `;
      getModal()(`✅ ${type} — תוצאה`, html, { size:'md' });
    }
  };

  // =====================================================
  // MODULE 3: RESOURCES LIBRARY
  // =====================================================
  const Resources = {
    LS: 'argaman_resources',

    list() {
      try { return JSON.parse(localStorage.getItem(this.LS)) || []; } catch { return []; }
    },

    save(list) {
      localStorage.setItem(this.LS, JSON.stringify(list));
    },

    open() {
      const items = this.list();
      const html = `
        <p>ספריית משאבים — קישורים, דפי עבודה, סרטונים. ניתן לשתף עם לקוחות.</p>
        <div style="display:flex;gap:.5rem;margin:1rem 0;flex-wrap:wrap">
          <button onclick="window.CRMExtensions.Resources.addPrompt()" style="padding:.5rem 1rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">+ משאב חדש</button>
          <input type="text" id="res-filter" placeholder="חיפוש..." oninput="window.CRMExtensions.Resources._refilter()" style="flex:1;padding:.5rem;border:1px solid #e5e7eb;border-radius:8px">
        </div>
        <div id="res-list">${this._renderList(items)}</div>
      `;
      getModal()('📚 ספריית משאבים (' + items.length + ')', html, { size:'lg' });
    },

    _refilter() {
      const q = document.getElementById('res-filter').value.toLowerCase();
      const filtered = this.list().filter(r =>
        (r.title||'').toLowerCase().includes(q) ||
        (r.tags||[]).some(t => t.toLowerCase().includes(q))
      );
      document.getElementById('res-list').innerHTML = this._renderList(filtered);
    },

    _renderList(items) {
      if (!items.length) return '<p style="color:#6b7280;text-align:center;padding:2rem">📭 הספרייה ריקה — הוסף משאב ראשון</p>';
      return items.map(r => `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:.75rem;margin-bottom:.5rem">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:.5rem;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <strong style="color:#1B3A6B">${({pdf:'📄',video:'🎬',link:'🔗',doc:'📝',audio:'🎵'})[r.type]||'📎'} ${esc(r.title)}</strong>
              ${r.url ? `<br><a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:#6b7280;font-size:.85rem;word-break:break-all">${esc(r.url.slice(0,60))}${r.url.length>60?'...':''}</a>` : ''}
              ${r.description ? `<p style="margin:.25rem 0 0;color:#6b7280;font-size:.85rem">${esc(r.description)}</p>` : ''}
              ${r.tags?.length ? `<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.4rem">${r.tags.map(t => `<span style="background:#eff4ff;color:#1B3A6B;padding:.1rem .5rem;border-radius:50px;font-size:.7rem">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
            <div style="display:flex;gap:.25rem">
              <button onclick="window.CRMExtensions.Resources.shareTo('${r.id}')" title="שתף עם לקוח" aria-label="שתף עם לקוח" style="background:#dcfce7;color:#16a34a;border:0;padding:.3rem .6rem;border-radius:6px;cursor:pointer">📤</button>
              <button onclick="window.CRMExtensions.Resources.del('${r.id}')" title="מחק" aria-label="מחק" style="background:#fee2e2;color:#dc2626;border:0;padding:.3rem .6rem;border-radius:6px;cursor:pointer">🗑️</button>
            </div>
          </div>
        </div>
      `).join('');
    },

    addPrompt() {
      const html = `
        <div style="display:flex;flex-direction:column;gap:.75rem">
          <div>
            <label style="font-weight:600">סוג משאב</label>
            <select id="res-type" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
              <option value="link">🔗 קישור</option>
              <option value="pdf">📄 PDF / דף עבודה</option>
              <option value="video">🎬 וידאו (YouTube/Vimeo)</option>
              <option value="audio">🎵 הקלטה / פודקאסט</option>
              <option value="doc">📝 מסמך טקסט</option>
            </select>
          </div>
          <div>
            <label style="font-weight:600">כותרת</label>
            <input id="res-title" type="text" placeholder="לדוגמה: דף עבודה — 4 הפרשים של Gottman" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
          <div>
            <label style="font-weight:600">כתובת (URL)</label>
            <input id="res-url" type="url" placeholder="https://..." style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
          <div>
            <label style="font-weight:600">תיאור (אופציונלי)</label>
            <textarea id="res-desc" rows="2" placeholder="למי זה מתאים?" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px"></textarea>
          </div>
          <div>
            <label style="font-weight:600">תגיות (פסיק בין כל אחת)</label>
            <input id="res-tags" type="text" placeholder="זוגיות, תקשורת, ויכוחים" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px">
          </div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end">
            <button onclick="window.CRMExtensions.closeModalSafe()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
            <button onclick="window.CRMExtensions.Resources._saveNew()" style="padding:.5rem 1.5rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">שמור משאב</button>
          </div>
        </div>
      `;
      getModal()('+ משאב חדש', html, { size:'md' });
    },

    _saveNew() {
      const title = $('#res-title').value.trim();
      if (!title) return showToast('חסרה כותרת','error');
      const item = {
        id: uid(),
        type: $('#res-type').value,
        title,
        url: $('#res-url').value.trim(),
        description: $('#res-desc').value.trim(),
        tags: $('#res-tags').value.split(',').map(s => s.trim()).filter(Boolean),
        createdAt: nowISO()
      };
      const list = this.list();
      list.unshift(item);
      this.save(list);
      audit('resource_added', { title });
      showToast('משאב נוסף');
      closeModalSafe();
      setTimeout(() => this.open(), 100);
    },

    del(id) {
      if (!confirm('למחוק את המשאב?')) return;
      const list = this.list().filter(r => r.id !== id);
      this.save(list);
      audit('resource_deleted');
      this.open(); // refresh
    },

    shareTo(resId) {
      const r = this.list().find(x => x.id === resId);
      if (!r) return;
      const html = `
        <p>בחרו לקוח לשליחת המשאב <strong>${esc(r.title)}</strong>:</p>
        <input type="text" id="res-share-search" placeholder="חיפוש לקוח..." oninput="window.CRMExtensions.Resources._refreshShareList('${resId}')" style="width:100%;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:.5rem">
        <div id="res-share-list" style="max-height:300px;overflow-y:auto">
          ${this._renderShareList((State.clients||[]).slice(0,15), r)}
        </div>
      `;
      getModal()('📤 שתף משאב', html, { size:'md' });
    },

    _refreshShareList(resId) {
      const q = $('#res-share-search').value.toLowerCase();
      const r = this.list().find(x => x.id === resId);
      const matches = (State.clients||[]).filter(c => (c.name||'').toLowerCase().includes(q)).slice(0,15);
      $('#res-share-list').innerHTML = this._renderShareList(matches, r);
    },

    _renderShareList(clients, r) {
      const msg = encodeURIComponent(`שלום! משאב שאני חושב שיכול לעזור לך:\n\n${r.title}${r.description?'\n'+r.description:''}\n\n${r.url||''}`);
      return clients.map(c => `
        <div style="padding:.5rem;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center">
          <span><strong>${esc(c.name||'')}</strong> <small style="color:#6b7280">${esc(c.phone||'')}</small></span>
          ${c.phone ? `<a href="https://wa.me/${c.phone.replace(/\D/g,'').replace(/^0/,'972')}?text=${msg}" target="_blank" rel="noopener" style="background:#25D366;color:#fff;padding:.3rem .8rem;border-radius:50px;text-decoration:none;font-size:.85rem">📱 שלח</a>` : '<small style="color:#9ca3af">אין טלפון</small>'}
        </div>
      `).join('') || '<p style="color:#6b7280">אין לקוחות תואמים</p>';
    }
  };

  // =====================================================
  // MODULE 4: GENOGRAM (SVG Family Tree)
  // =====================================================
  const Genogram = {
    LS: 'argaman_genograms',

    open(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return showToast('לקוח לא נמצא','error');
      const all = this.list();
      const g = all.find(x => x.clientId === clientId) || { clientId, members: [{ id:'self', name: c.name||'אני', gender:'?', x: 50, y: 50, role:'self' }], links: [], updatedAt: nowISO() };

      const html = `
        <div style="display:flex;gap:.5rem;margin-bottom:.75rem;flex-wrap:wrap">
          <button onclick="window.CRMExtensions.Genogram.addMember('male')" style="background:#1B3A6B;color:#fff;border:0;padding:.4rem .9rem;border-radius:8px;cursor:pointer;font-weight:600">+ זכר ▢</button>
          <button onclick="window.CRMExtensions.Genogram.addMember('female')" style="background:#8B4C8C;color:#fff;border:0;padding:.4rem .9rem;border-radius:8px;cursor:pointer;font-weight:600">+ נקבה ○</button>
          <button onclick="window.CRMExtensions.Genogram.toggleLinkMode()" id="gg-link-btn" style="background:#C9A84C;color:#1B3A6B;border:0;padding:.4rem .9rem;border-radius:8px;cursor:pointer;font-weight:600">🔗 חיבור</button>
          <button onclick="window.CRMExtensions.Genogram.save()" style="background:#16a34a;color:#fff;border:0;padding:.4rem .9rem;border-radius:8px;cursor:pointer;font-weight:600">💾 שמור</button>
          <button onclick="window.CRMExtensions.Genogram.exportSVG()" style="background:#6b7280;color:#fff;border:0;padding:.4rem .9rem;border-radius:8px;cursor:pointer;font-weight:600">⬇️ הורד</button>
        </div>
        <p style="color:#6b7280;font-size:.85rem">לחץ פעמיים לעריכת שם · גרור להזזה · במצב "🔗 חיבור" — לחץ על 2 חברים ליצירת קשר</p>
        <div id="gg-canvas" style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;overflow:auto;position:relative;min-height:400px"></div>
        <div style="margin-top:.5rem;font-size:.75rem;color:#6b7280">סימולים: ▢ זכר · ○ נקבה · ━ נישואין · ╱╱ פרידה · ⫽ גירושין · ⚡ קונפליקט</div>
      `;
      getModal()('🌳 Genogram — ' + esc(c.name||''), html, { size:'xl' });
      setTimeout(() => this._render(g), 100);
      this._state = { g, linkMode: false, linkFirst: null };
    },

    _render(g) {
      const canvas = $('#gg-canvas');
      if (!canvas) return;
      const w = 800, h = 500;
      let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:500px;background:#fafafa">`;
      // Render links
      g.links.forEach(l => {
        const a = g.members.find(m => m.id === l.from);
        const b = g.members.find(m => m.id === l.to);
        if (!a || !b) return;
        const ax = a.x*w/100, ay = a.y*h/100, bx = b.x*w/100, by = b.y*h/100;
        const style = l.type === 'divorce' ? 'stroke:#dc2626;stroke-width:2;stroke-dasharray:6,3' :
                      l.type === 'separation' ? 'stroke:#f59e0b;stroke-width:2;stroke-dasharray:3,3' :
                      l.type === 'conflict' ? 'stroke:#dc2626;stroke-width:3;stroke-dasharray:1,3' :
                      l.type === 'parent' ? 'stroke:#374151;stroke-width:1.5' :
                      'stroke:#1B3A6B;stroke-width:2';
        svg += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" style="${style}"/>`;
        // Label
        const mx = (ax+bx)/2, my = (ay+by)/2;
        const label = { marriage:'━', divorce:'⫽', separation:'╱', conflict:'⚡', parent:'↓' }[l.type] || '';
        if (label) svg += `<text x="${mx}" y="${my}" text-anchor="middle" font-size="16" fill="#1B3A6B">${label}</text>`;
      });
      // Render members
      g.members.forEach(m => {
        const x = m.x*w/100, y = m.y*h/100;
        const fill = m.gender === 'male' ? '#dbeafe' : m.gender === 'female' ? '#fce7f3' : '#f3f4f6';
        const stroke = m.gender === 'male' ? '#1B3A6B' : m.gender === 'female' ? '#8B4C8C' : '#6b7280';
        const shape = m.gender === 'female' ?
          `<circle cx="${x}" cy="${y}" r="22" fill="${fill}" stroke="${stroke}" stroke-width="2" class="gg-node" data-id="${m.id}" style="cursor:move"/>` :
          `<rect x="${x-22}" y="${y-22}" width="44" height="44" fill="${fill}" stroke="${stroke}" stroke-width="2" class="gg-node" data-id="${m.id}" style="cursor:move"/>`;
        svg += `<g>
          ${shape}
          ${m.deceased ? `<line x1="${x-25}" y1="${y-25}" x2="${x+25}" y2="${y+25}" stroke="#000" stroke-width="2"/><line x1="${x+25}" y1="${y-25}" x2="${x-25}" y2="${y+25}" stroke="#000" stroke-width="2"/>` : ''}
          ${m.role === 'self' ? `<circle cx="${x}" cy="${y}" r="28" fill="none" stroke="#C9A84C" stroke-width="3"/>` : ''}
          <text x="${x}" y="${y+38}" text-anchor="middle" font-size="11" fill="#1f2937" font-weight="600">${esc(m.name)}</text>
          ${m.age ? `<text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" fill="#6b7280">${m.age}</text>` : ''}
        </g>`;
      });
      svg += '</svg>';
      canvas.innerHTML = svg;

      // Wire interactions
      $$('.gg-node', canvas).forEach(node => {
        node.addEventListener('dblclick', (e) => {
          const id = e.target.dataset.id;
          this._editMember(id);
        });
        // Drag
        let dragging = false, offsetX = 0, offsetY = 0;
        node.addEventListener('mousedown', (e) => {
          if (this._state.linkMode) {
            this._handleLinkClick(e.target.dataset.id);
            return;
          }
          dragging = true;
          const svgEl = canvas.querySelector('svg');
          const pt = svgEl.createSVGPoint();
          pt.x = e.clientX; pt.y = e.clientY;
          const ctm = svgEl.getScreenCTM().inverse();
          const p = pt.matrixTransform(ctm);
          const m = this._state.g.members.find(x => x.id === e.target.dataset.id);
          offsetX = p.x - (m.x*w/100); offsetY = p.y - (m.y*h/100);
          e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
          if (!dragging) return;
          const svgEl = canvas.querySelector('svg');
          const pt = svgEl.createSVGPoint();
          pt.x = e.clientX; pt.y = e.clientY;
          const ctm = svgEl.getScreenCTM().inverse();
          const p = pt.matrixTransform(ctm);
          const m = this._state.g.members.find(x => x.id === node.dataset.id);
          if (m) {
            m.x = Math.max(5, Math.min(95, ((p.x - offsetX) / w * 100)));
            m.y = Math.max(8, Math.min(90, ((p.y - offsetY) / h * 100)));
            this._render(this._state.g);
          }
        });
        document.addEventListener('mouseup', () => { dragging = false; });
      });
    },

    addMember(gender) {
      const id = uid();
      this._state.g.members.push({ id, name: gender==='male'?'גבר':'אישה', gender, x: 30 + Math.random()*40, y: 30 + Math.random()*40 });
      this._render(this._state.g);
    },

    _editMember(id) {
      const m = this._state.g.members.find(x => x.id === id);
      if (!m) return;
      const newName = prompt('שם:', m.name);
      if (newName === null) return;
      m.name = newName;
      const ageStr = prompt('גיל (אופציונלי):', m.age || '');
      if (ageStr !== null) m.age = ageStr;
      const dec = confirm('האם נפטר?');
      m.deceased = dec;
      this._render(this._state.g);
    },

    toggleLinkMode() {
      this._state.linkMode = !this._state.linkMode;
      $('#gg-link-btn').style.background = this._state.linkMode ? '#dc2626' : '#C9A84C';
      $('#gg-link-btn').style.color = this._state.linkMode ? '#fff' : '#1B3A6B';
      $('#gg-link-btn').textContent = this._state.linkMode ? '🔗 בחר 2 חברים' : '🔗 חיבור';
      this._state.linkFirst = null;
    },

    _handleLinkClick(id) {
      if (!this._state.linkFirst) {
        this._state.linkFirst = id;
        showToast('בחר חבר משפחה שני');
      } else if (this._state.linkFirst !== id) {
        const linkType = prompt('סוג קשר:\n1 = נישואין\n2 = פרידה\n3 = גירושין\n4 = הורי-ילד\n5 = קונפליקט', '1');
        const types = { '1':'marriage', '2':'separation', '3':'divorce', '4':'parent', '5':'conflict' };
        const type = types[linkType] || 'marriage';
        this._state.g.links.push({ from: this._state.linkFirst, to: id, type });
        this._state.linkFirst = null;
        this.toggleLinkMode();
        this._render(this._state.g);
      }
    },

    save() {
      this._state.g.updatedAt = nowISO();
      const all = this.list().filter(g => g.clientId !== this._state.g.clientId);
      all.push(this._state.g);
      localStorage.setItem(this.LS, JSON.stringify(all));
      audit('genogram_saved', { clientId: this._state.g.clientId, members: this._state.g.members.length });
      showToast('Genogram נשמר ✓');
    },

    list() {
      try { return JSON.parse(localStorage.getItem(this.LS)) || []; } catch { return []; }
    },

    exportSVG() {
      const svg = $('#gg-canvas svg');
      if (!svg) return;
      const data = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([data], { type:'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `genogram_${todayISO()}.svg`;
      a.click();
      showToast('הורד');
    }
  };

  // =====================================================
  // MODULE 5: GOAL PROGRESS TRACKER (enhanced)
  // =====================================================
  const GoalTracker = {
    open(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return showToast('לקוח לא נמצא','error');
      c.treatment = c.treatment || { goals:[] };
      const goals = c.treatment.goals || [];

      const html = `
        <p>מעקב יעדים ויזואלי עבור <strong>${esc(c.name||'')}</strong></p>
        ${goals.length ? `<div style="display:flex;flex-direction:column;gap:1rem;margin:1rem 0">
          ${goals.map((g,i) => `
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;gap:.5rem">
                <strong style="color:#1B3A6B">${i+1}. ${esc(g.text)}</strong>
                <select onchange="window.CRMExtensions.GoalTracker.updateProgress('${clientId}',${i},this.value)" style="padding:.25rem .5rem;border:1px solid #e5e7eb;border-radius:6px;font-size:.85rem">
                  ${[0,10,25,50,75,90,100].map(v => `<option value="${v}" ${(g.progress||0)===v?'selected':''}>${v}%</option>`).join('')}
                </select>
              </div>
              <div style="height:12px;background:#f3f4f6;border-radius:6px;overflow:hidden">
                <div style="height:100%;background:linear-gradient(90deg,#1B3A6B,${(g.progress||0)>=100?'#16a34a':'#C9A84C'});width:${g.progress||0}%;transition:width .4s"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:.4rem;font-size:.75rem;color:#6b7280">
                <span>סטטוס: ${g.status==='achieved'?'<strong style="color:#16a34a">✓ הושג</strong>':g.status==='progress'?'<em style="color:#f59e0b">בהתקדמות</em>':'פעיל'}</span>
                <span>${g.progress||0}% הושלם</span>
              </div>
            </div>
          `).join('')}
        </div>` : '<p style="color:#6b7280">אין יעדים. צור יעדים דרך "🎯 תוכנית טיפול".</p>'}
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
          <button onclick="openTreatmentPlan('${clientId}')" style="padding:.5rem 1rem;background:#eff4ff;color:#1B3A6B;border:0;border-radius:8px;cursor:pointer;font-weight:600">✏️ ערוך יעדים</button>
        </div>
      `;
      getModal()('📊 מעקב יעדים — ' + esc(c.name||''), html, { size:'lg' });
    },

    updateProgress(clientId, goalIdx, value) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c?.treatment?.goals?.[goalIdx]) return;
      const v = parseInt(value);
      c.treatment.goals[goalIdx].progress = v;
      if (v >= 100) c.treatment.goals[goalIdx].status = 'achieved';
      else if (v >= 25) c.treatment.goals[goalIdx].status = 'progress';
      else c.treatment.goals[goalIdx].status = 'active';
      if (typeof save === 'function' && typeof LS !== 'undefined') save(LS.clients, State.clients);
      audit('goal_progress_updated', { clientId, goalIdx, progress: v });
    }
  };

  // =====================================================
  // MODULE 6: CLIENT PORTAL (Magic-link snapshot)
  // =====================================================
  const ClientPortal = {
    generate(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      if (!c) return showToast('לקוח לא נמצא','error');

      const allSess = (State.sessions||[]).filter(s => s.clientId === clientId);
      const completed = allSess.filter(s => s.status === 'completed');
      const paid = completed.filter(s => s.paid);
      const now = new Date();
      const upcoming = allSess.filter(s => s.status === 'scheduled' && new Date(s.date) >= now).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 5);
      const totalPaid = paid.reduce((sum,s) => sum + Number(s.price||0), 0);
      const outstanding = completed.filter(s => !s.paid && s.price).reduce((sum,s) => sum + Number(s.price), 0);

      // Outcome data
      const outcomes = (window.CRM ? window.CRM.ls.getJSON('argaman_outcomes',[]) : JSON.parse(localStorage.getItem('argaman_outcomes')||'[]')).filter(o => o.clientId === clientId);
      const phq = outcomes.filter(o => o.type === 'PHQ-9').sort((a,b) => a.date.localeCompare(b.date)).map(o => ({ label: new Date(o.date).toLocaleDateString('he-IL',{month:'numeric',day:'numeric'}), value: o.total }));
      const gad = outcomes.filter(o => o.type === 'GAD-7').sort((a,b) => a.date.localeCompare(b.date)).map(o => ({ label: new Date(o.date).toLocaleDateString('he-IL',{month:'numeric',day:'numeric'}), value: o.total }));
      const ors = outcomes.filter(o => o.type === 'ORS').sort((a,b) => a.date.localeCompare(b.date)).map(o => ({ label: new Date(o.date).toLocaleDateString('he-IL',{month:'numeric',day:'numeric'}), value: o.total }));

      const startDate = c.createdAt || c.startDate;
      const months = startDate ? Math.max(1, Math.round((now - new Date(startDate)) / (1000*60*60*24*30))) : 0;

      const bundle = {
        v: 1,
        name: c.name,
        firstName: (c.name||'').split(' ')[0],
        startDate,
        generated: new Date().toISOString(),
        stats: {
          sessionsCompleted: completed.length,
          totalMonths: months,
          goalsAchieved: (c.treatment?.goals||[]).filter(g => g.status === 'achieved').length,
          totalGoals: (c.treatment?.goals||[]).length,
          nextSession: upcoming[0] ? { date: upcoming[0].date, time: upcoming[0].time } : null
        },
        upcoming: upcoming.map(s => ({ date: s.date, time: s.time, location: s.location })),
        goals: (c.treatment?.goals||[]).map(g => ({ text: g.text, progress: g.progress||0, status: g.status })),
        outcomes: { phq, gad, ors },
        payments: { totalPaid, outstanding }
      };

      // Show generator dialog with options
      this._showGeneratorDialog(c, bundle);
    },

    _showGeneratorDialog(c, bundle) {
      const html = `
        <p>צור קישור פרטי עבור <strong>${esc(c.name||'')}</strong>.</p>
        <p style="font-size:.85rem;color:#6b7280">הקישור מכיל snapshot של הלקוח: פגישות, יעדים, מדדים, תשלומים. רק מי שיש לו את הקישור — יראה את התוכן.</p>

        <div style="margin:1rem 0">
          <label style="font-weight:600">💌 הודעה אישית (אופציונלי)</label>
          <textarea id="portal-note" rows="3" placeholder="לדוגמה: היי, שלחתי לך סיכום של איפה אנחנו עומדים. נשתמע בפגישה הבאה!" style="width:100%;padding:.6rem;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;margin-top:.25rem"></textarea>
        </div>

        <div style="background:#f9fafb;padding:.75rem;border-radius:8px;font-size:.85rem;margin-bottom:1rem">
          <strong style="color:#1B3A6B">תוכן הקישור:</strong>
          <ul style="margin:.4rem 0 0;padding-right:1.25rem;color:#6b7280">
            <li>${bundle.stats.sessionsCompleted} פגישות שהושלמו</li>
            <li>${bundle.upcoming.length} פגישות עתידיות</li>
            <li>${bundle.goals.length} יעדי טיפול עם progress</li>
            <li>${bundle.outcomes.phq.length + bundle.outcomes.gad.length + bundle.outcomes.ors.length} מדידות outcome</li>
            <li>סיכום תשלומים</li>
          </ul>
        </div>

        <div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap">
          <button onclick="window.CRMExtensions.closeModalSafe()" style="padding:.5rem 1rem;background:#f3f4f6;color:#374151;border:0;border-radius:8px;cursor:pointer">בטל</button>
          <button onclick="window.CRMExtensions.ClientPortal._copy('${c.id}')" style="padding:.5rem 1.25rem;background:#1B3A6B;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">📋 צור והעתק קישור</button>
          <button onclick="window.CRMExtensions.ClientPortal._whatsapp('${c.id}')" style="padding:.5rem 1.25rem;background:#25D366;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">📱 שלח ב-WhatsApp</button>
        </div>
      `;
      getModal()('🌐 פורטל לקוח — ' + esc(c.name||''), html, { size:'md' });
      // Store bundle for use after note input
      this._pendingBundle = bundle;
    },

    _buildLink(clientId) {
      const c = (State.clients||[]).find(x => x.id === clientId);
      const note = $('#portal-note')?.value.trim();
      const bundle = this._pendingBundle;
      if (note) bundle.note = note;
      // Encode as base64url
      const json = JSON.stringify(bundle);
      const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      const url = `https://argamanclinic.com/portal.html#d=${b64}`;
      audit('portal_link_generated', { clientId, bundleSize: json.length });
      return { url, c, sizeKB: Math.round(json.length / 1024) };
    },

    _copy(clientId) {
      const { url, sizeKB } = this._buildLink(clientId);
      navigator.clipboard.writeText(url).then(() => {
        showToast(`✓ הועתק (${sizeKB}KB). הדבק בכל מקום ושלח ללקוח`);
        closeModalSafe();
      }).catch(() => {
        // Fallback: show URL in modal
        const html = `<p>הקישור (העתק ידנית):</p>
        <textarea readonly style="width:100%;height:100px;padding:.5rem;border:1px solid #e5e7eb;border-radius:6px;font-family:monospace;font-size:.75rem">${url}</textarea>`;
        getModal()('📋 קישור פורטל', html, { size:'md' });
      });
    },

    _whatsapp(clientId) {
      const { url, c } = this._buildLink(clientId);
      if (!c.phone) return showToast('אין מספר טלפון ללקוח','error');
      const msg = encodeURIComponent(`שלום ${(c.name||'').split(' ')[0]}, הנה הפורטל האישי שלך:\n\n${url}\n\nתוכל לראות שם את הפגישות הקרובות, ההתקדמות והתשלומים. שמור את הקישור 🙏`);
      const phone = c.phone.replace(/\D/g,'').replace(/^0/,'972');
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      closeModalSafe();
      showToast('נפתח WhatsApp');
    }
  };

  // =====================================================
  // MODULE 7: TIME TRACKER (per-session stopwatch)
  // =====================================================
  const TimeTracker = {
    LS: 'argaman_time_logs',
    activeKey: 'argaman_active_timer',

    isRunning() {
      try { return !!JSON.parse(localStorage.getItem(this.activeKey)); } catch { return false; }
    },

    start(sessionId, label) {
      const c = (State.clients||[]).find(x => (State.sessions||[]).find(s => s.id === sessionId)?.clientId === x.id);
      const active = { sessionId, label: label || (c?.name||'פגישה'), startedAt: new Date().toISOString() };
      localStorage.setItem(this.activeKey, JSON.stringify(active));
      audit('timer_start', { sessionId });
      this._showTimerBar();
      showToast('⏱ טיימר התחיל');
    },

    stop() {
      let active;
      try { active = JSON.parse(localStorage.getItem(this.activeKey)); } catch {}
      if (!active) return showToast('אין טיימר פעיל','error');
      const startedAt = new Date(active.startedAt);
      const endedAt = new Date();
      const durationMin = Math.round((endedAt - startedAt) / 60000);
      const log = JSON.parse(localStorage.getItem(this.LS)||'[]');
      log.push({ id: uid(), ...active, endedAt: endedAt.toISOString(), durationMin });
      localStorage.setItem(this.LS, JSON.stringify(log.slice(-1000)));
      localStorage.removeItem(this.activeKey);
      audit('timer_stop', { sessionId: active.sessionId, durationMin });
      const bar = document.getElementById('timer-bar');
      if (bar) bar.remove();
      showToast(`⏹ ${durationMin} דקות נרשמו`);
    },

    _showTimerBar() {
      if (document.getElementById('timer-bar')) return;
      const active = JSON.parse(localStorage.getItem(this.activeKey));
      if (!active) return;
      const bar = document.createElement('div');
      bar.id = 'timer-bar';
      bar.style.cssText = 'position:fixed;bottom:1rem;left:1rem;background:#dc2626;color:#fff;padding:.6rem 1rem;border-radius:50px;box-shadow:0 8px 24px rgba(0,0,0,.2);z-index:9998;display:flex;align-items:center;gap:.5rem;font-weight:600;animation:pulse 2s infinite';
      bar.innerHTML = `<span>⏱</span><span id="timer-elapsed">00:00</span><span style="opacity:.8;font-weight:400">· ${esc(active.label)}</span><button onclick="window.CRMExtensions.TimeTracker.stop()" style="background:#fff;color:#dc2626;border:0;padding:.2rem .6rem;border-radius:50px;cursor:pointer;font-weight:700;font-family:inherit">⏹ עצור</button>`;
      document.body.appendChild(bar);
      const styleEl = document.createElement('style');
      styleEl.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.85}}';
      document.head.appendChild(styleEl);
      const update = () => {
        const a = JSON.parse(localStorage.getItem(this.activeKey)||'null');
        if (!a) { clearInterval(t); bar.remove(); return; }
        const sec = Math.floor((Date.now() - new Date(a.startedAt)) / 1000);
        const el = document.getElementById('timer-elapsed');
        if (el) el.textContent = `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
      };
      const t = setInterval(update, 1000);
      update();
    },

    summary() {
      const log = JSON.parse(localStorage.getItem(this.LS)||'[]');
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate()-7);
      const thisWeek = log.filter(l => new Date(l.startedAt) >= weekAgo);
      const totalMin = thisWeek.reduce((s,l) => s+l.durationMin, 0);
      const html = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin-bottom:1rem">
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:10px"><div style="font-size:.8rem;color:#6b7280">השבוע</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${(totalMin/60).toFixed(1)}<small style="font-size:1rem">ש׳</small></div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:10px"><div style="font-size:.8rem;color:#6b7280">פגישות השבוע</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${thisWeek.length}</div></div>
          <div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:10px"><div style="font-size:.8rem;color:#6b7280">ממוצע פגישה</div><div style="font-size:1.8rem;font-weight:800;color:#1B3A6B">${thisWeek.length?Math.round(totalMin/thisWeek.length):0}<small style="font-size:1rem">דק׳</small></div></div>
        </div>
        <h3 style="color:#1B3A6B">פגישות אחרונות</h3>
        ${log.slice(-20).reverse().map(l => `
          <div style="padding:.5rem;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;font-size:.85rem">
            <span><strong>${esc(l.label)}</strong> <small style="color:#6b7280">${fmtDt(l.startedAt)}</small></span>
            <strong style="color:#1B3A6B">${l.durationMin} דק׳</strong>
          </div>
        `).join('') || '<p style="color:#6b7280">אין רשומות עדיין</p>'}
      `;
      getModal()('⏱ סיכום זמני עבודה', html, { size:'lg' });
    }
  };

  // =====================================================
  // MODULE 8: KEYBOARD SHORTCUTS
  // =====================================================
  const Hotkeys = {
    init() {
      document.addEventListener('keydown', (e) => {
        // Ignore in input/textarea
        if (e.target.matches('input, textarea, select, [contenteditable]')) return;
        // Cmd/Ctrl + N → quick add lead
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          if (typeof window.quickAddLead === 'function') window.quickAddLead();
        }
        // Cmd/Ctrl + R → open Reports Hub (override page refresh — confirm first)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
          e.preventDefault();
          if (typeof window.openReportsHub === 'function') window.openReportsHub();
        }
        // Cmd/Ctrl + Shift + T → time tracker summary
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
          e.preventDefault();
          TimeTracker.summary();
        }
        // Cmd/Ctrl + Shift + F → full-text search across all records
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          if (typeof window.openFullSearch === 'function') window.openFullSearch();
        }
        // ? → show help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.showHelp();
        }
        // Esc → close modal
        if (e.key === 'Escape') {
          closeModalSafe();
        }
      });
      console.log('[Hotkeys] ✓ enabled');
    },

    showHelp() {
      const html = `
        <p>קיצורי דרך פעילים:</p>
        <table style="width:100%;margin:1rem 0">
          <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.5rem"><kbd style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-family:monospace">Ctrl+N</kbd></td><td>ליד חדש מהיר</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.5rem"><kbd style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-family:monospace">Ctrl+Shift+R</kbd></td><td>מרכז דוחות BI</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.5rem"><kbd style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-family:monospace">Ctrl+Shift+T</kbd></td><td>סיכום זמני עבודה</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.5rem"><kbd style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-family:monospace">Ctrl+Shift+F</kbd></td><td>חיפוש בכל הרשומות</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.5rem"><kbd style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-family:monospace">Ctrl+K</kbd></td><td>חיפוש גלובלי (קיים)</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:.5rem"><kbd style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-family:monospace">Esc</kbd></td><td>סגור מודל</td></tr>
          <tr><td style="padding:.5rem"><kbd style="background:#f3f4f6;padding:.2rem .5rem;border-radius:4px;font-family:monospace">?</kbd></td><td>הצג עזרה זו</td></tr>
        </table>
      `;
      getModal()('⌨️ קיצורי דרך', html, { size:'md' });
    }
  };

  // =====================================================
  // PUBLIC INTERFACE
  // =====================================================
  window.CRMExtensions = {
    RiskAssessment,
    MoreOutcomes,
    Resources,
    Genogram,
    GoalTracker,
    ClientPortal,
    TimeTracker,
    Hotkeys,
    closeModalSafe,

    init() {
      window.openRiskAssessment = id => RiskAssessment.chooseInstrument(id);
      window.openMoreOutcomeORS = id => MoreOutcomes.open(id, 'ORS');
      window.openMoreOutcomeDAS = id => MoreOutcomes.open(id, 'DAS-7');
      window.openMoreOutcomePCL = id => MoreOutcomes.open(id, 'PCL-5');
      window.openResources = () => Resources.open();
      window.openGenogram = id => Genogram.open(id);
      window.openGoalTracker = id => GoalTracker.open(id);
      window.openClientPortal = id => ClientPortal.generate(id);
      window.startTimer = (sessionId, label) => TimeTracker.start(sessionId, label);
      window.stopTimer = () => TimeTracker.stop();
      window.openTimerSummary = () => TimeTracker.summary();
      window.openHotkeysHelp = () => Hotkeys.showHelp();
      Hotkeys.init();
      // Restore running timer bar if any
      if (TimeTracker.isRunning()) TimeTracker._showTimerBar();
      console.log('[CRMExtensions] ✓ 8 modules loaded');
    }
  };

  window.CRMExtensions.init();

  } // end start()
})();
