# PRD.md — Smart AI Attendance & Time Tracking System (SATTS)

- **Version**: 1.1 (MVP-ready)
- **Date**: 2026-02-12
- **Status**: Draft → Ready for Engineering Estimation
- **Owner**: Product / HR Ops
- **Primary Users**: Staff, Manager, Super Admin (HR), Kiosk Device (Phase 4)

---

## Attention Point (Project Kill-Switch Risks)
1. **Biometric + Evidence Photo = High-sensitivity personal data**  
   Must ship with **Consent (versioned)** + **RBAC** + **Audit Log** + **Retention**. No “later”.
2. **Offline-first + Sync + Attachments**  
   Photos will explode storage/bandwidth unless you enforce **compression + limit + retention** from day one.
3. **Kiosk 1:N performance**  
   Browser 1:N face match is expensive. MVP must avoid it (or use a “select name → 1:1 verify” fallback).
4. **Liveness is not “anti-cheat guaranteed”**  
   Blink/smile blocks low-effort spoofing only. Define threat model clearly to avoid false expectations.

---

## 1. Understanding (Story + Context)
Monday 08:58. A staff member opens SATTS on their phone. No network in the basement lobby.  
They tap **Time In**. The browser camera opens, the model runs on-device, and SATTS compares the live face to the staff’s stored **face descriptors** (no raw profile images saved).  
It passes. SATTS writes an **attendance log** into local storage immediately (PouchDB/IndexedDB). A watermarked evidence photo is captured and attached to the log.  
At noon, the phone reconnects to the internet. Replication kicks in automatically and syncs all pending logs to the server.  
HR opens the admin panel and sees the latest check-ins, including location status and evidence, then exports payroll data at month end.

SATTS replaces punch cards and biometric hardware with a **web-based, offline-first, edge AI** approach that runs on **mobile, tablet, and PC**.

---

## 2. Assumptions (Reversible)
- **MVP targets ≤ 300 staff**, 1–3 offices/sites, 1–3 kiosk devices.
- **MVP uses CouchDB** as the primary remote store to leverage native PouchDB replication.
- Evidence photo is required **once per check event**, but is compressed and retention-controlled.

---

## 3. Goals & Success Metrics
### 3.1 Product Goals
- Replace manual punch card / hardware biometric attendance.
- Enable **offline** clock-in/out with reliable synchronization.
- Provide evidence trail: timestamp + location + watermark photo.
- Provide HR-friendly exports and auditability.

### 3.2 Success Metrics (MVP)
- **Offline reliability**: 99% of attendance events created successfully without network.
- **Sync reliability**: 99% of offline events replicated within 15 minutes after connectivity returns.
- **Latency**: Mobile 1:1 verification P95 < 1.2s.
- **Evidence size**: P95 photo attachment ≤ 200KB.
- **Admin utility**: HR can export monthly payroll CSV without manual corrections for ≥ 95% staff.

---

## 4. Non-Goals (MVP)
- Strong anti-spoof guarantees against video replay / 3D masks.
- Full advanced scheduling engine (complex shifts, rotating rosters).
- Kiosk full 1:N recognition at scale (Phase 4).
- Deep payroll computation (SATTS exports data; payroll system calculates).

---

## 5. Personas & Roles
| Role | Description | Core Capabilities |
|------|-------------|------------------|
| Super Admin | HR Head / System Owner | Configure offices/geofence, policies, users, exports, audit |
| Manager | Team Lead | View team attendance, exceptions, approvals (Phase 3+) |
| Staff | Employee | Enroll Face ID, Time In/Out, view own history |
| Kiosk Device | Shared entrance device | Runs kiosk mode (Phase 4) |

---

## 6. Product Scope (MVP Modules)
1) Identity + Consent + Face Enrollment  
2) Attendance (Mobile 1:1) + cooldown  
3) Geofence (radius) + location tagging  
4) Evidence capture + watermark + retention  
5) Offline-first sync (PouchDB↔CouchDB) + idempotency + de-dup  
6) Admin minimal (list, filter, view evidence, export CSV, reset face)

---

## 7. User Journeys (Key Flows)
### 7.1 Staff — First-time Enrollment
1. Open app → shown **Consent** (versioned).
2. Accept consent → camera opens.
3. Guided capture **20 angles** + **basic liveness challenge**.
4. System stores **descriptors only** in local DB; profile becomes ACTIVE after server sync / admin policy.

### 7.2 Staff — Time In / Time Out (Offline-first)
1. Tap **Time In** (or Time Out).
2. Face verification (1:1) against own descriptors.
3. Capture GPS (if available) and evaluate geofence.
4. If pass: create attendance log locally + evidence attachment.
5. If offline: mark as LOCAL_ONLY; later sync automatically.

### 7.3 HR Admin — Daily Monitoring & Export
1. Open Admin → list today’s logs (paginated).
2. Filter exceptions (OUT_OF_RANGE / LOCATION_UNAVAILABLE / LATE).
3. View evidence photo.
4. Export CSV for payroll cut-off.
5. Reset a staff’s Face ID if needed.

---

## 8. Functional Requirements (FR)

### 8.1 Identity, Consent & Enrollment
**FR-01 Consent (Versioned)**
- Must show consent gate before enrollment.
- Store consent version + accepted timestamp.

**FR-02 Multi-angle Capture (20 shots)**
- Guide user to capture 20 face images with angle cues.
- UI shows progress and capture quality hints.

**FR-03 Basic Liveness Challenge**
- During enrollment, require at least one challenge: blink/smile/head-turn.
- Record challenge type + passedAt.

**FR-04 Privacy Guarantee**
- Raw profile images are **not stored** for the profile; only descriptors are saved.

**FR-05 Admin Reset Face ID**
- Admin can force re-enrollment by setting enrollStatus = RESET_REQUIRED.

---

### 8.2 Attendance & Verification (Mobile 1:1)
**FR-06 Time In/Out Buttons**
- Mobile home shows two large buttons:
  - Time In (Green)
  - Time Out (Red)
- Haptic feedback on success.

**FR-07 1:1 Verification**
- Compare live descriptor vs logged-in user’s stored descriptors.
- Default threshold: Euclidean distance < 0.6 (configurable).

**FR-08 Cooldown**
- Prevent duplicate event of same action within 5 minutes.

**FR-09 Dual Timestamp**
- Store `clientTs` at creation.
- After sync, store/overwrite `serverTs` (authoritative for HR decisions).

---

### 8.3 Geofence (Radius)
**FR-10 Office Radius Config**
- Office: center(lat,lng) + radiusM.

**FR-11 GPS Capture**
- Capture `lat/lng/accuracyM` if allowed.
- If denied/unavailable, allow attendance but tag `LOCATION_UNAVAILABLE`.

**FR-12 Geofence Evaluation**
- Compute distance to office center and set:
  - IN_RANGE / OUT_OF_RANGE / LOCATION_UNAVAILABLE

---

### 8.4 Evidence & Watermark
**FR-13 Evidence Capture**
- On successful verification, capture current video frame to canvas.
- Encode to JPEG using evidence policy.

**FR-14 Watermark**
- Draw Top-right watermark:
  - clientTs (YYYY-MM-DD HH:mm:ss)
  - GPS (lat,lng) + accuracy
  - office name (or Unknown)
  - deviceId
- Store as attachment in local DB.

**FR-15 Evidence Access Control**
- Evidence is visible only to Admin roles (default).
- Staff can view their logs; evidence visibility is policy-controlled.

**FR-16 Retention**
- Local cleanup: after ACK + retentionDays, attachment may be deleted locally (log stays).
- Server retention: configurable (default 90 days).

---

### 8.5 Offline Sync, Idempotency & Conflicts
**FR-17 Replication Lifecycle**
- When online, auto start replicate (to remote + from remote).
- When offline, pause; resume automatically.

**FR-18 Event Idempotency**
- Every attendance event has `eventId` (UUID).
- Duplicate sends must not create duplicate valid records.

**FR-19 De-dup Rule**
- Same staffId + same action within 5 minutes + same geofence status => mark duplicates.
- Keep earliest serverTs as VALID; others as DUPLICATE (audited, not deleted).

**FR-20 Profile Conflict Rule**
- Server wins on profile conflicts.
- If client detects RESET_REQUIRED/LOCKED, must block attendance and prompt re-enroll.

---

### 8.6 Admin (Minimal)
**FR-21 Admin Log List**
- Paginated list: filter by date range, staff, dept, status, action.
- Show sync status and exception flags.

**FR-22 View Evidence**
- Admin can open evidence attachment.

**FR-23 Export CSV**
- Export fields include: staffId, name, dept, action, serverTs, clientTs, geo status, distanceM, deviceId, evidenceRef.

**FR-24 Audit Log**
- Record Admin actions: exports, resets, policy changes.

---

## 9. UI/UX Requirements
### 9.1 Mobile (Staff)
- Portrait orientation.
- Home: big Time In/Time Out buttons.
- Camera default: front camera (`facingMode: 'user'`).
- Clear “success” and “why failed” messages (permission, not enrolled, mismatch, cooldown).

### 9.2 PC (Admin)
- Landscape.
- Sidebar navigation: Dashboard (optional), Logs, Staff, Settings, Exports, Audit.
- Evidence viewer: image modal + metadata.

### 9.3 Kiosk (Phase 4)
- Full-screen camera + recent activity sidebar.
- Default camera: environment/webcam.

---

## 10. Data Requirements (Schema & Contracts)

### 10.1 Document Types
- USER_PROFILE
- ATTENDANCE_LOG
- OFFICE
- POLICY_CONFIG
- AUDIT_LOG

### 10.2 USER_PROFILE (Example)
```json
{
  "_id": "user::staff_001",
  "type": "USER_PROFILE",
  "orgId": "org_01",
  "staffId": "staff_001",
  "name": "Alice Tan",
  "dept": "Sales",
  "enrollStatus": "ACTIVE",
  "descriptorVersion": "faceapi-vX",
  "faceDescriptors": [],
  "consent": { "version": "2026-02-12", "acceptedAt": "2026-02-12T01:00:00Z" },
  "settings": { "allowedOfficeId": "office_hq_01" }
}
````

### 10.3 ATTENDANCE_LOG (Example)

```json
{
  "_id": "log::550e8400-e29b-41d4-a716-446655440000",
  "type": "ATTENDANCE_LOG",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "orgId": "org_01",
  "staffId": "staff_001",
  "action": "IN",
  "deviceId": "dev_abc",
  "clientTs": "2026-02-12T09:00:00+08:00",
  "serverTs": null,
  "verify": { "distance": 0.42, "threshold": 0.6, "result": "PASS" },
  "gps": { "lat": 1.3521, "lng": 103.8198, "accuracyM": 10 },
  "geoPolicyResult": { "status": "IN_RANGE", "officeId": "office_hq_01", "distanceM": 12 },
  "syncState": "LOCAL_ONLY",
  "dedupe": { "status": "VALID", "groupKey": "staff_001|IN|2026-02-12T09:00:00+08:00" },
  "_attachments": {
    "evidence.jpg": { "content_type": "image/jpeg", "data": "base64..." }
  }
}
```

### 10.4 POLICY_CONFIG (MVP)

* verificationThreshold (default 0.6)
* cooldownSec (default 300)
* evidencePolicy: { maxWidth, jpegQuality, maxPerEvent }
* retention: { localDays, serverDays }

---

## 11. Technical Architecture (High-level)

### 11.1 Frontend

* React (Vite)
* Tailwind CSS
* face-api.js (TensorFlow.js)
* PouchDB (IndexedDB)

### 11.2 Backend

* CouchDB as replication target (MVP)
* Optional bridge to PostgreSQL for analytics/reporting (Phase 3+)

### 11.3 Offline-first Strategy

* Write local first (PouchDB)
* Sync: replicate to/from remote when online
* Conflicts: server authoritative for profiles; logs de-dup by rule and audit

---

## 12. Security, Privacy & Compliance

### 12.1 Privacy Principles

* Profile stores descriptors only (no raw face images).
* Evidence photos are sensitive; access restricted to Admins (default).

### 12.2 Security Controls (MVP)

* HTTPS mandatory for camera & geolocation.
* RBAC enforced server-side for admin endpoints.
* Audit log for admin actions.
* Data retention policies (local cleanup + server retention).

### 12.3 Threat Model (Explicit)

* Defends against: printed/photo spoof, simple replay attempts (limited).
* Does NOT guarantee defense against: high-quality video replay, 3D mask attacks (requires stronger liveness/hardware).

---

## 13. Non-Functional Requirements (NFR)

* **Performance**: 1:1 verification P95 < 1.2s; evidence generation P95 < 800ms.
* **Reliability**: offline event creation must succeed without network.
* **Storage**: evidence P95 ≤ 200KB; local storage cap policy.
* **Observability**: error logs for permission denied, model load fail, sync fail.
* **Scalability**: MVP supports ≤ 300 staff; kiosk scale is Phase 4.

---

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

---
 