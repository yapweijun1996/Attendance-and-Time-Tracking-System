# Task Follow-up History

Moved from `task.md` to keep main board under 300 lines.

## Follow-up Log (2026-02-12, Round A)
- Scope: Build unblock + runtime stability hardening.
- Completed:
  - Fixed PouchDB `sync` typing constraint in `src/services/db.ts` to keep TypeScript build green.
  - Stabilized camera lifecycle in `src/components/Camera/WebcamCapture.tsx` to avoid restart loops from callback identity changes.
  - Tuned `src/services/face.ts` TinyFaceDetector `inputSize` to `320` and added `(0, 1]` threshold validation.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Remaining Risks:
  - Bundle size warning remains (`face-api.js` + `pouchdb-browser`), should be addressed with lazy loading/code-splitting in next task.

## Follow-up Log (2026-02-12, Round A2)
- Scope: Bundle optimization with lazy loading and manual chunk split.
- Completed:
  - `src/App.tsx` switched to dynamic import for `./services/db` and `./services/face`.
  - `vite.config.ts` added `build.rollupOptions.output.manualChunks` for `face-api` / `tfjs` / `pouchdb`.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Entry chunk reduced to `dist/assets/index-*.js` ~`5.94 kB` (gzip `2.65 kB`).
- Remaining Risks:
  - `vendor-tfjs-core` still ~`545.72 kB`, continues to trigger >500kB warning.

## Follow-up Log (2026-02-12, Round A3)
- Scope: Build warning cleanup and output stabilization.
- Completed:
  - Kept `events` alias in `vite.config.ts` to avoid browser externalized warning.
  - Set `build.chunkSizeWarningLimit` to `560` in `vite.config.ts`.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - No chunk size warning emitted at current artifact sizes.
- Remaining Risks:
  - `vendor-tfjs-core` physical size remains ~`545.72 kB`; warning is tuned, not size-eliminated.

## Follow-up Log (2026-02-12, Round A4)
- Scope: Fix runtime crash from `pouchdb-browser` event emitter setup.
- Completed:
  - Root cause confirmed at `pouchdb-browser` `setUpEventEmitter`: relies on enumerable `EE.prototype` methods.
  - Updated `src/polyfills/events.ts` to mark prototype methods enumerable so `Pouch.on`/`Pouch.emit` can be bound.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - Node check: `Object.keys(EventEmitter.prototype)` includes `on` and `emit`.
- Testing Blocker:
  - In this sandbox, `npm run dev` fails with `listen EPERM` (cannot bind localhost port), so browser runtime check must be executed on host machine.

## Follow-up Log (2026-02-12, Round A5)
- Scope: Shift Face model loading from boot-time to user-triggered action.
- Completed:
  - Updated `src/App.tsx` so boot flow only initializes DB.
  - Added explicit `Load Face Models` button and loading state; FaceAPI models now load on demand.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Expected Outcome:
  - Reduced initial CPU/GPU peak on page load.
  - Better perceived startup responsiveness before biometric flow begins.

## Follow-up Log (2026-02-12, Round B1)
- Scope: Deep bundle-slim evaluation via external runtime loading.
- Completed:
  - Reworked Face runtime to load external scripts (`tf.min.js`, `tf-backend-wasm.js`, `face-api.js`) from `/vendor`.
  - Added `src/services/face-runtime.ts` and kept `src/services/face.ts` API stable for callers.
  - Split files to stay under 300-line constraint.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - `vendor-tfjs-core` chunk removed from `dist/assets`.
- Tradeoff:
  - Added `dist/vendor` static runtime payload (~4.46 MB) loaded on demand; improves bundle metrics but shifts cost to first biometric use.

## Follow-up Log (2026-02-12, Round B2)
- Scope: Runtime UX improvement for model loading progress visibility.
- Completed:
  - Added staged progress reporting in `faceAPIService.loadModels()` for `tiny/landmark/recognition`.
  - Added UI progress bar and per-stage status labels in `App.tsx`.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - `npm run dev -- --host 127.0.0.1 --port 4173` starts successfully.
- Expected Outcome:
  - User can see exact model-loading stage and completion percentage instead of generic loading text.

## Follow-up Log (2026-02-12, Round B3)
- Scope: WASM runtime preloading to reduce perceived waiting time.
- Completed:
  - Added runtime preloading API in face service/runtime layers.
  - Added idle-time WASM runtime warmup in `App.tsx` after DB is ready.
  - Added runtime status display (`WASM PRELOADING` / `WASM READY` + backend).
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Expected Outcome:
  - Lower delay between user click and model-loading start because runtime setup happens earlier in idle time.

## Follow-up Log (2026-02-12, Round B4)
- Scope: Optimize first-use latency for users who perform face verification immediately.
- Completed:
  - Auto-started Face model preload right after DB readiness in `App.tsx`.
  - Added model-load dedupe guard (`modelLoadPromise`) in `face.ts`.
  - Added post-load warmup inference on a tiny black canvas to reduce first real verification latency spike.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - `npm run dev -- --host 127.0.0.1 --port 4173` starts successfully.
- Expected Outcome:
  - Faster first face verification response for “enter-and-verify-immediately” users.

## Follow-up Log (2026-02-12, Round B5)
- Scope: Add per-stage model load timing observability (ms).
- Completed:
  - Extended model load progress payload with `stageElapsedMs` and `totalElapsedMs`.
  - Updated `App.tsx` to show per-stage loaded time and total FaceAPI model load time.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - `npm run dev -- --host 127.0.0.1 --port 4173` starts successfully.
- Expected Outcome:
  - Faster bottleneck identification for tiny/landmark/recognition stages during performance tuning.

## Follow-up Log (2026-02-12, Round C1)
- Scope: Layout v1 documentation baseline and task-board synchronization.
- Completed:
  - Added `docs/Layout_v1.md` with MVP IA, route map, screen layout blocks, state matrix, and Given/When/Then acceptance criteria.
  - Added Task D to this task board with Ready-to-Code structure and verification commands.
- Verification:
  - `test -f docs/Layout_v1.md` passed.
  - `rg -n "State Matrix|Acceptance Criteria|IA & Navigation" docs/Layout_v1.md` passed.
  - `wc -l docs/Layout_v1.md` = `183` (under 300 lines).
- Expected Outcome:
  - Frontend implementation can proceed with lower ambiguity across Staff and Admin surfaces.

## Follow-up Log (2026-02-12, Round C2)
- Scope: Sprint 2 page-level execution breakdown based on Layout v1.
- Completed:
  - Added `docs/Sprint2_Page_Task_Breakdown.md` with six page tasks (`S2-P1..S2-P6`), each including DoD and terminal verification commands.
  - Added Task E tracking entry and verification commands in this board.
- Verification:
  - `test -f docs/Sprint2_Page_Task_Breakdown.md` passed.
  - `wc -l docs/Sprint2_Page_Task_Breakdown.md` expected under 300 lines.
- Expected Outcome:
  - Team can implement Sprint 2 pages sequentially with explicit dependencies and exit gates.
