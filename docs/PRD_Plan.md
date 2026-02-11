# Delivery Plan & Roadmap

## 14. Roadmap & Phases
### Phase 1 (MVP)
* Enrollment + Attendance 1:1 + Evidence + Sync + Admin export + Reset + Audit

### Phase 2
* Live feed (incremental polling), improved exception dashboards, better retention automation

### Phase 3
* Team calendar/heatmap, reporting warehouse (PostgreSQL), manager approvals (leave/late reasons)

### Phase 4
* Kiosk mode optimization (prefer “select name → 1:1” first, then evaluate limited 1:N)

---

## 15. Delivery Plan (Sprint Plan)
### Sprint 1 (2 weeks): Enroll + Offline Attendance (No evidence/sync required for demo)
* Consent (versioned)
* Enrollment 20-angle + basic liveness
* Time In/Out local-first + cooldown
* Threshold policy read + dual timestamp structure

### Sprint 2 (2 weeks): Evidence + Geofence + Sync (attachments)
* Office radius config
* GPS capture + geofence tagging
* Evidence capture + watermark + policy controls
* Replication lifecycle + eventId idempotency (+ de-dup if time)

### Sprint 3 (2 weeks): Admin Minimal + Export + RBAC/Audit
* Admin log list + filters + evidence viewer
* CSV export for payroll cut-off
* Reset face + profile conflict behavior
* Audit log for admin actions
* De-dup completion if not done in Sprint 2

---

## 16. Jira-ready Epics (MVP)
* **E1** Identity, Consent & Enrollment
* **E2** Attendance (Mobile 1:1) + Cooldown + Dual Ts
* **E3** Geofence (Radius)
* **E4** Evidence + Watermark + Retention
* **E5** Sync + Idempotency + De-dup + Admin + Export + Audit

---

## 17. Risks & Mitigations
1. **Attachment sync too heavy** → enforce compression, size targets, retention
2. **Device clock wrong** → use serverTs for HR decisions, retain clientTs for audit
3. **Face mismatch in bad lighting** → enrollment quality checks + multi-angle + retake flow
4. **Kiosk scale** → postpone true 1:N; use “select name → 1:1” fallback

---

## 18. Open Questions (Must answer before Sprint 2 ends)
1. Evidence photo: mandatory for every event or only exceptions?
2. Retention: serverDays/localDays exact policy (legal/HR requirement)?
3. Attendance rules: what defines “late”? (serverTs-based cut-off time?)
4. Multi-site: do staff belong to one office only or multiple?

---

## 19. Acceptance Criteria (MVP Release Gates)
MVP is shippable only if:
* Offline Time In/Out works reliably.
* Sync auto-recovers and is idempotent (no duplicate valid records).
* Evidence policy controls size and retention.
* Admin export is HR-usable and audited.
* Consent + RBAC + Reset flows are enforced.
