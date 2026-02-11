# Technical Architecture & Data

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
```

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
* **AI Model**: `face-api.js` (TensorFlow.js).
  > **Optimization Note**: Use `Tiny Face Detector` model for mobile devices to ensure low latency and reduced CPU/GPU usage.
* PouchDB (IndexedDB) with **Encryption Adapter** (e.g., `crypto-pouch` or similar) for protecting locally stored descriptors.

### 11.2 Backend
* CouchDB as replication target (MVP)
* Optional bridge to PostgreSQL for analytics/reporting (Phase 3+)

### 11.3 Offline-first Strategy
* Write local first (PouchDB)
* Sync: replicate to/from remote when online.
* **Timestamp Logic**:
  - `clientTs`: Set by device when event is created.
  - `serverTs`: Applied by server (via Validation Function or update handler) upon replication. This is the source of truth for payroll.
* Conflicts: server authoritative for profiles; logs de-dup by rule and audit.

---

## 12. Security, Privacy & Compliance
### 12.1 Privacy Principles
* Profile stores descriptors only (no raw face images).
* **Local Data Encryption**: Biometric descriptors in PouchDB MUST be encrypted at rest on the client device.
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
* **Performance**: 1:1 verification P95 < 1.2s (using Tiny Face Detector); evidence generation P95 < 800ms.
* **Reliability**: offline event creation must succeed without network.
* **Storage**: evidence P95 ≤ 200KB; local storage cap policy.
* **Observability**: error logs for permission denied, model load fail, sync fail.
* **Scalability**: MVP supports ≤ 300 staff; kiosk scale is Phase 4.
