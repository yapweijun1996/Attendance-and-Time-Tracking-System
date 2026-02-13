# Functional & UX Requirements

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
