# Project Overview - Smart AI Attendance & Time Tracking System (SATTS)

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
