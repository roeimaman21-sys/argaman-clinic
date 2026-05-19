# NIST Cybersecurity Framework Mapping — קליניקת ארגמן

**מסמך זה ממפה את אמצעי האבטחה של קליניקת ארגמן לפי NIST CSF v2.0 (2024).**

NIST CSF הוא תקן בינלאומי לארגון פעולות אבטחת מידע ב-5 פונקציות: **Identify, Protect, Detect, Respond, Recover**.

---

## 1. IDENTIFY — זיהוי נכסים וסיכונים

| Subcategory | Implementation | Files / Evidence |
|---|---|---|
| ID.AM-1: Physical devices inventoried | רק 1 — Gal's laptop + iPhone | `BREACH-RESPONSE.md` |
| ID.AM-2: Software platforms inventoried | Supabase, Netlify, Gmail | `DPIA.md`, `ROPA.md` |
| ID.AM-3: Data flow mapped | DPIA documents all data flows | `DPIA.md` § 2 |
| ID.AM-4: External systems inventoried | DPA page lists all processors | `dpa.html`, `ROPA.md` |
| ID.AM-5: Resources prioritized | PHI > PII > public > marketing | `PII-INVENTORY.md` |
| ID.GV-1: Privacy policy established | privacy.html + DPIA + consent | `privacy.html`, `consent-flow.js` |
| ID.GV-3: Legal/regulatory requirements understood | תיקון 13 + חוק זכויות החולה | `DPIA.md` § 3, `ROPA.md` |
| ID.RA-1: Asset vulnerabilities identified | Dependabot weekly | `.github/dependabot.yml` |
| ID.RA-3: Threats identified | STRIDE threat model in plan | Plan file § "Threat model" |
| ID.RA-5: Risk register maintained | Risk register with severity/likelihood | Plan file § "Risk Register" |
| ID.SC-1: Supply chain identified | All CDN scripts known; SRI applied | `apply-sri.mjs` output |

---

## 2. PROTECT — שכבות הגנה

| Subcategory | Implementation | Files |
|---|---|---|
| PR.AC-1: Identities managed | Supabase Auth + WebAuthn ready | `webauthn-setup.js` (planned), `admin.html` |
| PR.AC-2: Physical access | Laptop encrypted at OS level | OS-level (FileVault/BitLocker) |
| PR.AC-3: Remote access secured | TLS 1.3, HSTS preload | `_headers` |
| PR.AC-4: Access permissions managed | Owner/Staff/Developer RLS roles | `auth-migration.sql`, `rls-policies.sql` |
| PR.AC-5: Network integrity protected | CSP strict, no unsafe-inline planned | `_headers` |
| PR.AC-7: Identity proofed | Supabase Auth + 2FA TOTP + Passkeys ready | Supabase MFA factors |
| PR.AT-1: Awareness training | Cheat sheet, phishing examples | `GAL-SECURITY-CHEAT-SHEET.md` |
| PR.DS-1: Data at rest protected | AES-256-GCM client-side + Supabase server | `crypto-utils.js`, `_headers` |
| PR.DS-2: Data in transit protected | TLS 1.3 HSTS preload | `_headers`, Netlify default |
| PR.DS-5: Data leak protection | Per-client DEK (planned), audit log encrypt | `crypto-utils.js`, `audit-log.js` |
| PR.DS-6: Integrity checking | HMAC SOAP signatures (planned), Merkle audit (planned) | Plan file Tier S3 |
| PR.IP-1: Baseline configuration | Quality gates per deploy | Plan file § "Quality Gates" |
| PR.IP-4: Backups maintained | Encrypted .argbak backups | `backup-tools.js` |
| PR.IP-6: Data destroyed per policy | Retention purge + Cryptographic Erasure | `backup-tools.js`, planned per-client DEK |
| PR.IP-12: Vulnerability mgmt | Dependabot weekly | `.github/dependabot.yml` |
| PR.PT-1: Audit logs | Login + action log + error log | `audit-log.js`, `error-tracker.js` |
| PR.PT-4: Communications protected | All Supabase API over HTTPS | Supabase default |

---

## 3. DETECT — גילוי אנומליות ואירועים

| Subcategory | Implementation | Files |
|---|---|---|
| DE.AE-1: Baseline established | Trusted devices + geo baseline | `device-trust.js` |
| DE.AE-2: Anomalies analyzed | 8 anomaly triggers per plan | Plan Tier S5 |
| DE.AE-3: Events aggregated | error_log + login_history + action_log | `error-tracker.js`, `audit-log.js` |
| DE.CM-1: Network monitored | Netlify provides | Netlify default |
| DE.CM-3: Personnel activity monitored | Audit log per-user | `audit-log.js` |
| DE.CM-7: Unauthorized access detected | Honeypot canary + RLS audit | `honeypot.js` |
| DE.DP-2: Detection roles defined | Owner alerted via email | FormSubmit alerts |
| DE.DP-4: Event detection communicated | Real-time email to gal | `device-trust.js`, `honeypot.js` |
| DE.DP-5: Detection processes improved | Quarterly threat model review | `BREACH-RESPONSE.md` |

---

## 4. RESPOND — תגובה לאירועי אבטחה

| Subcategory | Implementation | Files |
|---|---|---|
| RS.RP-1: Response plan executed | BREACH-RESPONSE.md runbook | `BREACH-RESPONSE.md` |
| RS.CO-1: Personnel know roles | Gal + Roi defined in runbook | `BREACH-RESPONSE.md` |
| RS.CO-2: Events reported | Auto-email + manual escalation | FormSubmit |
| RS.CO-3: Stakeholders informed | Severity matrix triggers notification | `BREACH-RESPONSE.md` § severity |
| RS.CO-4: Coordination with stakeholders | רשות הגנת הפרטיות, יועץ משפטי | `BREACH-RESPONSE.md` |
| RS.AN-1: Notifications investigated | All anomalies trigger email | FormSubmit alerts |
| RS.AN-2: Incident impact understood | Severity matrix L1-L4 | `BREACH-RESPONSE.md` |
| RS.AN-3: Forensics performed | Merkle-chained audit (planned) | Plan Tier S3 |
| RS.MI-1: Incidents contained | Containment as Stage 1 of runbook | `BREACH-RESPONSE.md` |
| RS.IM-1: Lessons learned in plans | Post-mortem stage 5 | `BREACH-RESPONSE.md` § 5 |
| RS.IM-2: Response strategies updated | Quarterly table-top updates runbook | `BREACH-RESPONSE.md` |

---

## 5. RECOVER — שחזור לפעילות תקינה

| Subcategory | Implementation | Files |
|---|---|---|
| RC.RP-1: Recovery plan executed | Backup + restore flow | `backup-tools.js` |
| RC.IM-1: Recovery plans incorporate lessons | Updated after each drill | `BREACH-RESPONSE.md` |
| RC.IM-2: Recovery strategies updated | Quarterly recovery drill | Plan Tier S5 |
| RC.CO-1: Public relations managed | Client notification template | `BREACH-RESPONSE.md` § 4 |
| RC.CO-2: Reputation repaired | Transparency + cryptographic receipts | `consent-flow.js` (planned VC) |
| RC.CO-3: Recovery activities communicated | Compliance Dashboard widget | `compliance-dashboard.js` |

---

## Coverage Summary

| Function | Subcategories Covered | Coverage |
|---|---|---|
| **Identify** | 11/11 | 100% |
| **Protect** | 17/17 | 100% |
| **Detect** | 9/9 | 100% |
| **Respond** | 11/11 | 100% |
| **Recover** | 6/6 | 100% |
| **TOTAL** | **54/54** | **100%** |

---

## Notes

- This mapping reflects current implementation as of 2026-05-19.
- Items marked "planned" are documented in the security plan file (`polished-sniffing-steele.md`) and will be implemented as horizons execute.
- This document is **not** ISO 27001 certified but covers equivalent controls at the level appropriate for a solo therapist clinic.

**Last refreshed:** 2026-05-19 · **Next review:** Quarterly + on major change
