# Sprint 1 - Core Services Task Board

## Progress Snapshot (2026-02-12)
- Task A: DONE
- Task B: DONE
- Task C: DONE
- Task D: DONE
- Task E: DONE
- Task F: DONE
- Task G: DONE
- Gate Check: `npm run build` + `npm run lint` passed

## Dependency Tree
- Task B depends on Task A model path readiness.
- Task C depends on Task A and Task B initialization hooks in `App.tsx`.
- Task D depends on PRD v1.1 functional scope freeze and Sprint 1 runtime constraints.
- Task E depends on Task D layout baseline and PRD Sprint 2 scope lock.
- Task F depends on Task E page-level breakdown and owner bandwidth planning.
- Task G depends on Task F component cards for C01/C02/C04 execution order.

## Task A - PouchDB Service (Singleton)
### Context & Goal
- Goal: Provide offline-first local storage service for SATTS attendance flow.
- Why: Attendance and profile data MUST be writable even when network is unavailable.

### Technical Spec
- Logic:
  - MUST initialize a single local database instance named `satts_db`.
  - MUST expose `put(doc)`, `get(id)`, `sync(remoteUrl, options)` wrappers.
  - SHOULD provide runtime guard for non-browser IndexedDB environments.
- Interface:
  - `PouchDBService.getInstance()`
  - `init(dbName?: string): PouchDB.Database`
  - `put<T>(doc): Promise<Response>`
  - `get<T>(id): Promise<Document>`
  - `sync(remoteUrl, options?): Replication.Sync`

### Definition of Done
- `src/services/db.ts` exists and compiles.
- `App.tsx` can initialize db and print init log.

### Security & Constraints
- MUST keep encryption adapter as placeholder for later sprint.
- MUST avoid destructive sync defaults; use `live/retry` only.

### Verification
- `npm run build` passes.
- Browser console includes `[SATTS][DB] initialized`.

## Task B - FaceAPI Service (Singleton + Tiny Detector)
### Context & Goal
- Goal: Centralize face model loading and descriptor matching for 1:1 verification.
- Why: Attendance verification MUST be deterministic and reusable.

### Technical Spec
- Logic:
  - MUST load `tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet` from `/models`.
  - MUST expose `detectFace(videoEl)` returning descriptor and score.
  - MUST expose `matchFace(descriptor)` based on Euclidean distance.
  - SHOULD support optional `meanDescriptor` optimization path.
- Interface:
  - `loadModels(modelPath?: string): Promise<void>`
  - `setProfiles(profiles: FaceProfile[]): void`
  - `detectFace(videoEl: HTMLVideoElement): Promise<DetectFaceResult | null>`
  - `matchFace(descriptor, threshold?): MatchFaceResult`

### Definition of Done
- `src/services/face.ts` exists and compiles.
- `App.tsx` logs model load status.

### Security & Constraints
- MUST not store raw face images in service state.
- MUST support Node-safe import behavior (browser-required methods throw clear errors in Node runtime).

### Verification
- `npm run build` passes.
- Browser network panel returns 200 for `/models/*.json` and `/models/*.bin`.

## Task C - Camera Component (Reusable)
### Context & Goal
- Goal: Reusable camera component for image capture in enrollment/attendance flows.
- Why: Camera capture is a shared UI primitive for multiple flows.

### Technical Spec
- Logic:
  - MUST start camera via `navigator.mediaDevices.getUserMedia`.
  - MUST default to `facingMode: "user"`.
  - MUST expose capture button to return JPEG blob.
- Interface:
  - Props: `onCapture(blob)`, `onError(error)`, `facingMode`, `className`.

### Definition of Done
- `src/components/Camera/WebcamCapture.tsx` exists and compiles.
- `App.tsx` embeds camera and logs captured blob size.

### Security & Constraints
- MUST run only on HTTPS or localhost in browser.
- SHOULD keep video constraints lightweight to reduce CPU/GPU pressure.

### Verification
- `npm run build` passes.
- Manual: camera preview visible and capture callback triggered.

## Task D - Layout v1 Design Baseline (MVP)
### Context & Goal
- Goal: Deliver a build-ready layout blueprint covering IA, screen blocks, states, and acceptance criteria.
- Why: Sprint 2/3 modules (evidence/sync/admin) need a stable UI contract before page implementation.

### Technical Spec
- Logic:
  - MUST map PRD FR-01~FR-24 into concrete route-level layout and state definitions.
  - MUST define role-based navigation for Staff Mobile and Admin PC.
  - MUST include offline/sync/cooldown/permission/error states in a single state matrix.
  - SHOULD include performance-oriented UI constraints to reduce CPU/GPU pressure.
- Interface:
  - Deliverable file: `docs/Layout_v1.md`
  - Sections required:
    - Attention Points
    - IA & Navigation
    - Screen Layout Spec
    - State Matrix
    - Acceptance Criteria (Given/When/Then)
    - Component Inventory + Implementation Sequence

### Definition of Done
- `docs/Layout_v1.md` exists and is linked from task tracking.
- Layout covers Staff (`/m/*`) and Admin (`/admin/*`) MVP surfaces.
- State matrix includes loading/empty/error/offline/permission dimensions.
- Acceptance criteria can be converted directly into QA test cases.

### Security & Constraints
- MUST keep evidence visibility restricted to Admin default policy.
- MUST preserve low-load strategy: no camera/model residency outside verify/enroll screens.
- SHOULD avoid introducing manager-only pages in MVP navigation (Phase 3 scope).

### Verification
- `test -f docs/Layout_v1.md` passes.
- `rg -n "State Matrix|Acceptance Criteria|IA & Navigation" docs/Layout_v1.md` returns matches.
- `wc -l docs/Layout_v1.md` output should stay under 300 lines.

## Task E - Sprint 2 Page Task Breakdown (Execution Ready)
### Context & Goal
- Goal: Convert `Layout_v1` into Sprint 2 page-level executable tasks with page DoD and terminal verification commands.
- Why: Enable implementation sequencing with low ambiguity and clear release gates.

### Technical Spec
- Logic:
  - MUST provide per-page task specs for Sprint 2 in a dedicated doc.
  - MUST include `Context/Spec/DoD/Security/Verification` for each page task.
  - MUST define dependency tree and known pitfalls for execution order.
- Interface:
  - Deliverable file: `docs/Sprint2_Page_Task_Breakdown.md`
  - Page task IDs:
    - `S2-P1` Mobile Home
    - `S2-P2` Mobile Verify
    - `S2-P3` Mobile Result
    - `S2-P4` Mobile History
    - `S2-P5` Admin Settings Lite
    - `S2-P6` Admin Logs Lite

### Definition of Done
- `docs/Sprint2_Page_Task_Breakdown.md` exists and each page task has DoD + verification commands.
- Document includes Sprint 2 exit gate and dependency tree.

### Security & Constraints
- MUST keep evidence access as Admin-only by default.
- MUST preserve low-load behavior (camera/model only active in verify flow).
- SHOULD keep this task board concise; detailed page specs remain in docs file.

### Verification
- `test -f docs/Sprint2_Page_Task_Breakdown.md` passes.
- `rg -n "S2-P1|S2-P2|Definition of Done|Verification" docs/Sprint2_Page_Task_Breakdown.md` returns matches.
- `wc -l docs/Sprint2_Page_Task_Breakdown.md` output should stay under 300 lines.

## Task F - Sprint 2 Component Task Cards (Execution Scheduling)
### Context & Goal
- Goal: Split Sprint 2 page tasks into component-level cards (0.5~1 day) with owner suggestions.
- Why: Improve sprint assignment clarity and reduce implementation handoff ambiguity.

### Technical Spec
- Logic:
  - MUST provide component cards mapped to `S2-P1..S2-P6`.
  - MUST include `Context/Spec/DoD/Security/Verification` per card.
  - MUST include estimate and owner suggestion per card.
- Interface:
  - Deliverable file: `docs/Sprint2_Component_Task_Cards.md`
  - Card range: `C01..C14`

### Definition of Done
- `docs/Sprint2_Component_Task_Cards.md` exists and includes 0.5~1 day estimates.
- All cards include DoD + verification commands.
- Document includes dependency tree and component exit gate.

### Security & Constraints
- MUST preserve Admin-only evidence access in component design.
- MUST preserve low-load verify lifecycle (load-on-enter, release-on-exit).

### Verification
- `test -f docs/Sprint2_Component_Task_Cards.md` passes.
- `rg -n "C01|C14|Estimate|Owner Suggestion|DoD|Verification" docs/Sprint2_Component_Task_Cards.md` returns matches.
- `wc -l docs/Sprint2_Component_Task_Cards.md` output should stay under 300 lines.

## Task G - Implement C01/C02/C04 + Register MVP (Mobile Flow Foundation)
### Context & Goal
- Goal: Ship executable mobile flow foundation for `Home -> Verify -> Result` and Register MVP (`consent -> capture -> liveness -> descriptor save`).
- Why: Unlock Sprint 2 page implementation from design docs into running UI.

### Technical Spec
- Logic:
  - MUST implement C01 route shell (`/m/home`, `/m/verify`, `/m/result`, `/m/history`, `/m/profile`).
  - MUST implement C02 dual action buttons on Home and route navigation with `action=IN|OUT`.
  - MUST implement C04 verify runtime lifecycle: model load on enter, camera stream release on exit.
- Interface:
  - `src/mobile/MobileApp.tsx`
  - `src/mobile/pages/HomePage.tsx`
  - `src/mobile/pages/VerifyPage.tsx`
  - `src/components/Camera/LiveCamera.tsx`

### Definition of Done
- Mobile routes render correctly and can navigate between Home/Verify/Result/History/Profile.
- Home action buttons navigate with action query parameter.
- Verify flow can run 1:1 match against enrolled descriptors using `POLICY_CONFIG.verification.threshold`, and only write local event when matched.
- Register flow can complete consent, collect 20 descriptors + photos (each new descriptor MUST differ by >=15%), pass passive liveness (no action detection), and write profile data to PouchDB.
- Lint/build both pass.

### Security & Constraints
- MUST keep camera/model runtime only in Verify page.
- MUST keep files under 300 lines where possible.

### Verification
- `npm run lint` passes.
- `npm run build` passes.
- `rg -n "/m/home|/m/verify|/m/enroll/consent|/m/enroll/capture|/m/enroll/liveness|Verify And Save|Capture Descriptor|Save Enrollment" src` returns matches.

## Known Pitfalls
- Face model files missing under `public/models` causes model load failures.
- Camera permission denied is expected on insecure origins (non-HTTPS / non-localhost).

## Follow-up History
- See `task_followup_history.md` for archived round-by-round execution logs (A1~C2).

## Follow-up Log (2026-02-12, Round B6)
- Scope: Enforce no-click model preload policy for immediate face verification users.
- Completed:
  - Auto-preload remains default path; manual button is hidden unless preload fails.
  - Added retry-only control for failure state.
  - Archived historical logs to `task_followup_history.md` to keep `task.md` maintainable.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - `npm run dev -- --host 127.0.0.1 --port 4173` starts successfully.

## Follow-up Log (2026-02-12, Round C3)
- Scope: Sprint 2 component-level scheduling pack.
- Completed:
  - Added `docs/Sprint2_Component_Task_Cards.md` with `C01..C14`.
  - Each component card includes estimate (0.5~1 day), owner suggestion, DoD, and verification commands.
  - Added Task F tracking in this board.
- Verification:
  - `test -f docs/Sprint2_Component_Task_Cards.md` passed.
  - `wc -l docs/Sprint2_Component_Task_Cards.md` expected under 300 lines.
- Expected Outcome:
  - Sprint 2 assignment can be done by component cards instead of page-level only.

## Follow-up Log (2026-02-12, Round C4)
- Scope: Execute Sprint 2 component cards `C01`, `C02`, `C04`.
- Completed:
  - Replaced `src/App.tsx` shell with mobile-first entry (`src/mobile/MobileApp.tsx`) and route scaffold.
  - Implemented `Home` with dual attendance buttons and status strip.
  - Implemented `Verify` with on-enter model load, live camera stream, face detection, local event write, and result handoff.
  - Added reusable `src/components/Camera/LiveCamera.tsx`.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Expected Outcome:
  - Mobile MVP flow is now executable and ready for next component cards (`C03`, `C05`, `C06`, `C07`).
## Follow-up Log (2026-02-12, Round C5)
- Scope: Execute component cards `C03`, `C05`, `C06`, `C07`, `C08` + tri-platform layout + visual system closure.
- Completed:
  - Added service pipeline for attendance history/geofence/evidence/device metadata and wired Verify flow to reuse shared domain logic.
  - Added idempotent + cooldown guards and reason-code result mapping to stabilize submit/retry behavior.
  - Added tri-platform route shells (`src/app/*`, `src/admin/*`, `src/mobile/*`) to cover Landing + Staff + Admin entry points.
  - Extended design tokens + shared `ui-*` classes in `src/index.css` so all page files now follow one visual system across PC/Mobile/Tablet.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.

## Follow-up Log (2026-02-12, Round C37)
- Scope: Harden `/m/enroll/capture` for production enrollment quality and clearer runtime behavior.
- Completed:
  - Enforced serial startup: model must be ready before camera mount; added waiting loader and 15s slow-network hint.
  - Upgraded captured-photo preview to fullscreen modal and wired auto pause/resume for auto-capture during preview.
  - Added anti-blur gate (`src/mobile/utils/sharpness.ts`, Laplacian variance): dynamic threshold by light level, `BLURRY` state, blur-score debug output in dev, vibration on 3+ consecutive blurry frames, plus anchor same-person distance guard.
  - Added stricter occlusion gate (`src/mobile/utils/face-visibility.ts`, `src/mobile/utils/visibility-image-checks.ts`): tighter mouth/eye geometry checks with lower-face and eye-region pixel checks to block hand-over-face/mask frames before descriptor/photo write.
  - Simplified capture HUD and controls: split `[status][progress]` pills, removed low-value prompt text, dropped manual Continue button, and auto-advance to next step at target count.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Expected Outcome:
  - Blurry/occluded/mixed-identity frames are blocked from enrollment, capture flow is less error-prone under weak network/motion, and operator feedback is immediate.
