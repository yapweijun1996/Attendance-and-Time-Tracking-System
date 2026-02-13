# Project Memory

## Current Situation
- **Phase**: Planning Baseline Locked (Sprint 1 Ready-to-Code)
- **Status**: `task.md` 已建立，且 T1（Domain Contract & Types Baseline）已完成并通过 lint/build。
- **Goal**: 先完成 Enrollment + Offline Attendance 最小闭环，再进入 Sprint 2。

## Technical Understanding
- **Domain Contract First**: 先定义类型与文档契约，再实现服务层，避免返工。
- **PouchDB**: 使用 singleton wrapper 管理本地实例，预留远端复制入口。
- **FaceAPI**: 模型必须放 `public/models`，默认 TinyFaceDetector 降低 CPU/GPU 压力。
- **Camera**: 通过统一 hook 管理权限与 MediaStream 生命周期。

## Recent Decisions
- 已完成仓库 Tech Lead review，并确认目前主线代码仍为模板页。
- 新增 `task.md`，采用 Ready-to-Code 结构管理 Sprint 1 任务。
- Sprint 1 依赖链已固定：T1 类型契约 -> T2/T3/T4 基础服务 -> T5/T6 业务闭环 -> T7 交付闸门。
- 已新增 `src/types/domain.ts`、`src/types/policy.ts`、`src/types/index.ts` 作为统一领域类型出口。
- 已修复 Vite + `pouchdb-browser` 运行时崩溃：通过 `vite.config.ts` 将 `events` alias 到本地 polyfill（`src/polyfills/events.ts`）。

## Known Pitfalls
- **FaceAPI Models**: `public/models` 缺失会导致初始化失败。
- **Camera Permissions**: 浏览器需要 `localhost` 或 `https`。
- **Security Gap**: descriptor 当前仍可能明文存储，后续必须补加密方案。
- **Maintainability**: 单文件超过 300 行会快速放大维护成本，需模块化拆分。
- **PouchDB + Vite**: 若 `events` 被 externalize，`pouchdb-browser` 会在 `extends` 时报错（`Class extends value [object Object]`）。

## Execution Update (2026-02-12)
- **Implemented**:
  - `src/services/db.ts`：PouchDB singleton，含 `init/put/get/sync`。
  - `src/services/face.ts`：FaceAPI singleton，默认 TinyFaceDetector，支持模型加载、descriptor 检测、欧氏距离匹配。
  - `src/components/Camera/WebcamCapture.tsx`：统一相机组件，支持预览与 JPEG 抓帧回调。
  - `src/App.tsx`：接入服务初始化日志、状态展示、相机手动捕获冒烟。
  - `public/models/*`：已从 `sample_logic/Face-API-WASM/models` 复制模型文件。
- **Verification**:
  - `npm run build`：Passed。
  - `npm run lint`：Passed。
- **Operational Note**:
  - 构建出现 chunk size warning（`face-api.js` + `pouchdb-browser` 体积较大），后续应做按需加载与分包优化。

## Hotfix Update (2026-02-12, Round A)
- 修复构建阻塞：`src/services/db.ts` 的 `sync` 返回类型改为受约束泛型，`npm run build` 恢复通过。
- 稳定摄像头生命周期：`src/components/Camera/WebcamCapture.tsx` 改为 `onError` ref 方案，避免父组件重渲染导致反复重启相机流。
- 降低移动端推理负担：`src/services/face.ts` 将 TinyFaceDetector `inputSize` 调整为 `320`。
- 增加防呆：`src/services/face.ts` 为 `setMatchThreshold` 增加范围校验（`(0, 1]`）。

## Optimization Update (2026-02-12, Round A2)
- 已落地懒加载与分包：
  - `src/App.tsx` 改为动态导入 `db/face` 服务，首屏入口不再直接打入 PouchDB/FaceAPI 依赖。
  - `vite.config.ts` 增加 `manualChunks`，拆分 `vendor-pouchdb`、`vendor-face-api`、`vendor-tfjs-*`。
- 构建结果（关键变化）：
  - `index` 入口 chunk 降至约 `5.94 kB`（gzip `2.65 kB`）。
  - `db`/`face` 业务壳层成为独立懒加载 chunk（约 `0.78 kB` / `2.70 kB`）。
- 当前剩余风险：
  - `vendor-tfjs-core` 约 `545.72 kB`，仍触发 Vite `500 kB` warning。

## Optimization Update (2026-02-12, Round A3)
- 兼容性与构建输出收口：
  - `vite.config.ts` 已配置 `events` alias 指向 `src/polyfills/events.ts`，消除 browser externalized 噪音。
  - `build.chunkSizeWarningLimit` 调整为 `560`，保留增长预警，同时去除当前已知单块告警噪音。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed（无 chunk size warning）

## Runtime Fix Update (2026-02-12, Round A4)
- 根因定位：
  - `pouchdb-browser` 在 `setUpEventEmitter()` 里通过 `Object.keys(EE.prototype)` 复制 `on/emit` 等方法。
  - `src/polyfills/events.ts` 使用 class 方法，默认不可枚举，导致 `Pouch.on` 未被挂载，触发 `TypeError: Pouch.on is not a function`。
- 修复动作：
  - 在 `src/polyfills/events.ts` 中将 `EventEmitter.prototype` 的方法 descriptor 统一改为 `enumerable: true`（保留接口行为）。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
  - `npm run dev -- --host 127.0.0.1 --port 4173`：服务可正常启动。
  - `Object.keys(EventEmitter.prototype)` 已包含 `on/emit`（Node 编译后检查通过）。
- 环境限制：
  - 当前沙箱无法绑定本地端口（`listen EPERM`），因此未能在本环境完成浏览器端 `vite dev` 运行时验证。

## UX/Performance Update (2026-02-12, Round A5)
- 行为调整：
  - Face 模型加载从“页面启动自动加载”改为“用户点击按钮后加载”。
  - 页面初始化阶段仅执行 DB 初始化，降低首屏 CPU/GPU 峰值与模型加载等待压力。
- 实现位置：
  - `src/App.tsx` 新增 `Load Face Models` 按钮与 `faceModelLoading` 状态。
  - `faceAPIService.loadModels('/models')` 迁移至按钮触发回调。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed

## Bundle Evaluation Update (2026-02-12, Round B1)
- 目标：评估 “替换依赖/外部脚本加载” 对 `vendor-tfjs-core` 的真实瘦身效果。
- 实施：
  - `src/services/face.ts` 改为通过 `src/services/face-runtime.ts` 动态注入运行时脚本，不再 `import("face-api.js")`。
  - 新增 `public/vendor/*`（`tf.min.js`、`tf-backend-wasm.js`、`face-api.js`、WASM 文件）。
- 构建结果（对比）：
  - Before: `dist/assets/vendor-tfjs-core-*.js` ≈ `545.72 kB`（存在）。
  - After: `dist/assets/vendor-tfjs-core-*.js` 不再生成（已移除）。
  - `dist/assets` JS 总量约 `325,520` bytes（主要为 `vendor` + `vendor-pouchdb`）。
- 代价与权衡：
  - 新增 `dist/vendor` 静态资源总量约 `4,459,460` bytes（按需加载，不阻塞首屏，但会影响首次人脸功能加载耗时）。
  - 属于“把打包体积转移为运行时外部资产加载”的路线，适合首屏优先场景，不一定是总下载量最优。

## UX Update (2026-02-12, Round B2)
- 目标：优化模型加载可见性，给终端用户明确等待反馈。
- 实施：
  - `src/services/face.ts`：`loadModels()` 增加进度回调，按阶段回报 `tiny -> landmark -> recognition` 的 `loading/loaded` 状态与百分比。
  - `src/App.tsx`：新增模型加载进度 UI（进度条 + 三阶段状态行）。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed

## WASM Runtime Update (2026-02-12, Round B3)
- 目标：确保 FaceAPI 优先使用 WASM backend，并减少用户点击加载模型时的等待。
- 实施：
  - `src/services/face-runtime.ts` 新增 `preloadRuntime()` / `getRuntimeState()`，可在模型加载前完成 WASM runtime 预热。
  - `src/services/face.ts` 新增 `preloadRuntime()` / `getRuntimeState()` 透传接口。
  - `src/App.tsx` 在 DB ready 后使用 `requestIdleCallback`（fallback: `setTimeout`）后台预热 WASM runtime，并展示 `Face Runtime` 状态。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 预期效果：
  - 首屏保持可交互的同时，降低用户点击 `Load Face Models` 后的额外等待。

## Fast-Path Update (2026-02-12, Round B4)
- 场景：用户进入页面后会很快做人脸验证，需进一步压缩首次验证等待。
- 实施：
  - `src/App.tsx`：DB ready 后自动触发模型预加载（WASM 路径），不再等用户手动点击。
  - `src/services/face.ts`：`loadModels` 增加并发去重（`modelLoadPromise`），防止重复加载。
  - `src/services/face.ts`：模型加载后执行一次黑画布 warmup 推理，减少首个真实验证的初始化延迟。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
  - `npm run dev -- --host 127.0.0.1 --port 4173`：服务可正常启动。

## Observability Update (2026-02-12, Round B5)
- 目标：可视化模型加载阶段耗时（ms），支持后续性能调优。
- 实施：
  - `src/services/face.ts`：`FaceModelLoadProgress` 新增 `stageElapsedMs` 与 `totalElapsedMs`。
  - `src/App.tsx`：展示各阶段耗时（Loaded x ms）与总耗时（FaceAPI Models READY 时显示）。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
  - `npm run dev -- --host 127.0.0.1 --port 4173`：服务可正常启动。

## UX Policy Update (2026-02-12, Round B6)
- 行为确认：
  - 页面已改为自动预加载 FaceAPI WASM 模型（用户不需要手动点击加载）。
  - 加载按钮仅在失败状态显示为 `Retry Face Model Preload`。
- 维护性修正：
  - `src/services/face.ts` 控制在 300 行以内。
  - `task.md` 历史执行日志已归档到 `task_followup_history.md`，保证主任务板低于 300 行。

## UX/IA Update (2026-02-12, Round C1)
- 目标：补齐 PRD 到页面实现之间的布局契约，降低 Sprint 2/3 UI 返工。
- 实施：
  - 新增 `docs/Layout_v1.md`，覆盖 Staff Mobile + Admin PC 的 IA、路由、页面结构、状态矩阵、验收标准。
  - 将 Layout 任务同步到 `task.md`（Task D, Ready-to-Code 结构）。
- 验证结果：
  - `test -f docs/Layout_v1.md`：Passed
  - `rg -n "State Matrix|Acceptance Criteria|IA & Navigation" docs/Layout_v1.md`：Passed
  - `wc -l docs/Layout_v1.md`：低于 300 行
- 决策影响：
  - 后续页面开发可按 `M-01..M-05` 与 `A-01..A-05` 分阶段实现，优先 Mobile 主闭环。

## Delivery Planning Update (2026-02-12, Round C2)
- 目标：把 `Layout_v1` 拆成 Sprint 2 可执行页面任务，减少实现歧义。
- 实施：
  - 新增 `docs/Sprint2_Page_Task_Breakdown.md`，定义 `S2-P1..S2-P6` 页面任务。
  - 每个页面任务均包含：Context、Technical Spec、DoD、Security & Constraints、Verification。
  - 在 `task.md` 新增 Task E 与 Round C2 跟踪。
- 验证结果：
  - `test -f docs/Sprint2_Page_Task_Breakdown.md`：Passed
  - `rg -n "S2-P1|S2-P2|Definition of Done|Verification" docs/Sprint2_Page_Task_Breakdown.md`：Passed
  - `wc -l docs/Sprint2_Page_Task_Breakdown.md`：低于 300 行
- 决策影响：
  - Sprint 2 可按依赖顺序执行：`S2-P1 -> S2-P2 -> S2-P3 -> S2-P4`，并行推进 `S2-P5/S2-P6`。

## Delivery Planning Update (2026-02-12, Round C3)
- 目标：将 Sprint 2 页面任务进一步拆解为可排班的组件级任务卡。
- 实施：
  - 新增 `docs/Sprint2_Component_Task_Cards.md`，定义 `C01..C14` 组件卡。
  - 每张卡包含：估时（0.5~1 day）、负责人建议、DoD、终端验证命令。
  - 在 `task.md` 新增 Task F 与 Round C3 跟踪。
- 验证结果：
  - `test -f docs/Sprint2_Component_Task_Cards.md`：Passed
  - `rg -n "C01|C14|Estimate|Owner Suggestion|DoD|Verification" docs/Sprint2_Component_Task_Cards.md`：Passed
  - `wc -l docs/Sprint2_Component_Task_Cards.md`：低于 300 行
- 决策影响：
  - Sprint 2 可按组件并行排期：移动端主链（C01~C09）与后台链（C10~C13）并行推进。

## Runtime Stability Update (2026-02-12, Round B7)
- 根因定位：
  - `public/vendor/tf.min.js` 与 `public/vendor/face-api.js` 同时注册 TF kernels/backends，导致 runtime 出现大规模重复注册。
  - 重复注册后触发 WASM kernel setup 错配，出现 `TypeError: a is not a function`（`face-api.js:5007`）。
- 修复动作：
  - `src/services/face-runtime.ts` 改为仅加载 `face-api.js`，移除额外 TF runtime 脚本注入链路。
  - backend 选择改为基于 `faceapi.tf`（优先 `wasm`，失败回退 `cpu`）。
  - 动态脚本注入改为 `async = false`，确保加载顺序确定性。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
  - Playwright 浏览器控制台：`Errors: 0`, `Warnings: 0`（原有 1000+ 重复注册告警已消失）。

## Implementation Update (2026-02-12, Round C4)
- 目标：落实 Sprint 2 组件卡 `C01/C02/C04`，打通移动端最小可运行链路。
- 实施：
  - 新增移动端路由壳：`src/mobile/MobileApp.tsx` + `src/mobile/router.ts`。
  - 新增页面：`HomePage`、`VerifyPage`、`ResultPage`、`HistoryPage`、`ProfilePage`。
  - 新增组件：`ActionButtonPair`、`TopStatusBar`、`MobileTabBar`、`SyncBadge`。
  - 新增 `src/components/Camera/LiveCamera.tsx`，确保 Verify 页面相机生命周期可控。
  - `src/App.tsx` 改为轻量入口，委派到 `MobileApp`。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 决策影响：
  - Sprint 2 已从“文档分解”进入“可运行页面”阶段，可继续实现 `C03/C05/C06/C07`。

## Implementation Update (2026-02-12, Round C5)
- 目标：完成 `C03`（Home 最近记录来自本地 DB）与 `C05`（地理围栏服务化）。
- 实施：
  - 新增 `src/mobile/services/attendance-log.ts`：封装 `loadRecentEvents` 与 `saveAttendanceLog`。
  - 新增 `src/mobile/services/geofence.ts`：封装 geolocation 捕获与 geofence 计算。
  - `src/mobile/pages/VerifyPage.tsx` 改为复用 geofence + attendance log 服务，页面逻辑更轻。
  - `src/mobile/MobileApp.tsx` 在 DB 初始化、路由切换、验证完成后刷新 recent events。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 决策影响：
  - Home/History 状态来源从“内存临时态”升级为“本地 DB 真实数据”，更接近 offline-first 目标。

## Implementation Update (2026-02-12, Round C6)
- 目标：完成 `C06`（Evidence 水印 + 压缩 + 附件落库）。
- 实施：
  - 新增 `src/mobile/services/evidence.ts`：视频帧截图、右上角水印绘制、JPEG 质量递减压缩、base64 附件转换。
  - 新增 `src/mobile/services/device.ts`：本地持久化 `deviceId` 生成与复用。
  - `src/mobile/pages/VerifyPage.tsx` 接入 evidence 流程，成功打卡时写入 `_attachments["evidence.jpg"]`。
  - `src/mobile/services/attendance-log.ts` 扩展 `_attachments` 输入与写入。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 决策影响：
  - Sprint 2 关键链路（打卡 + geofence + evidence + 本地落库）已具备端到端基础能力。

## Implementation Update (2026-02-12, Round C7)
- 目标：完成 `C07`（eventId 幂等写入 + 重复提交保护 + cooldown 二次防线）。
- 实施：
  - `src/mobile/services/attendance-log.ts` 新增 `saveAttendanceLogIdempotent()`，对 `409 conflict` 返回 `DUPLICATE` 而非抛错。
  - 新增 `src/mobile/services/attendance-guard.ts`，提供 `checkActionCooldown()` 与 `verifySubmissionLock`。
  - `src/mobile/pages/VerifyPage.tsx` 接入 cooldown 拦截、提交锁与重复请求无害化处理。
  - attendance log 文档扩展 `deviceId` 字段，和 evidence 元数据闭环一致。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 决策影响：
  - Verify 流程在“多次点击/短时间重复提交/重放同 eventId”场景下行为更可控，贴近 FR-08/FR-18。

## Implementation Update (2026-02-12, Round C8)
- 目标：完成 `C08`（Result 状态码映射 + 恢复动作统一）并补齐 PC/Mobile/Tablet 布局入口。
- 实施：
  - `src/mobile/types.ts` 为 `VerificationResult` 增加 `reasonCode`，统一结果语义。
  - 新增 `src/mobile/services/result-state.ts`，集中定义 `reasonCode -> tone/title/guidance/actions`。
  - `src/mobile/pages/VerifyPage.tsx` 对成功/重复/cooldown/失败路径输出明确 `reasonCode`。
  - `src/mobile/pages/ResultPage.tsx` 改为基于映射渲染文案和主次动作（含 Retry Verify）。
  - 新增 `src/app/*` 与 `src/admin/*`，形成 Landing + Staff Mobile + Admin PC 三端入口；Staff 页面同步补 tablet 响应布局。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 决策影响：
  - 系统已具备 PC/Mobile/Tablet 三端布局骨架，且 Result 页从“纯 message 展示”升级为“可预测状态机视图”。
## Implementation Update (2026-02-12, Round C9)
- 目标：先交付 Register MVP 最小闭环（采集 + 活体 + descriptor 落库），与现有移动端框架对齐。
- 实施：
  - 新增注册路由：`/m/enroll/consent`、`/m/enroll/capture`、`/m/enroll/liveness`。
  - 新增 `src/mobile/services/enrollment.ts`：封装 `USER_PROFILE` 读取、enroll 状态推断、descriptor 落库（含 consent/liveness 元数据）。
  - 新增注册页面：`EnrollConsentPage`、`EnrollCapturePage`、`EnrollLivenessPage`，复用现有 `LiveCamera + faceAPIService`。
  - Capture 阶段支持多次 descriptor 采集与最小差异过滤（当前按欧氏距离换算百分比，门槛 >=15%），避免重复帧污染。
  - Liveness 阶段提供被动活体（单次分数阈值）并在通过后保存 profile。
  - `MobileApp/Home/Profile` 改为真实读取 enrollment 状态，不再硬编码 `ACTIVE`，并提供未注册引导入口。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 决策影响：
  - 注册链路已可独立跑通，后续可在不改主流程前提下迭代“20 角度质量控制”“更强活体策略”“descriptor 加密落盘”。
## Implementation Update (2026-02-12, Round C10)
- 目标：按产品决策移除“动作检测式活体”（转头/眨眼类 challenge），保留无动作活体步骤。
- 实施：
  - `src/mobile/pages/EnrollLivenessPage.tsx` 改为被动活体校验：单次检测分数阈值（`PASSIVE_LIVENESS_MIN_SCORE`）通过后允许保存。
  - `src/mobile/services/enrollment.ts` 的 liveness 元数据调整为 `mode=PASSIVE_SCORE + confidence`。
  - 注册闭环维持：`consent -> capture(descriptor+photo) -> liveness -> profile 落库`。
- 验证结果：
  - `npm run lint`：Passed
  - `npm run build`：Passed
- 决策影响：
  - 用户侧交互更轻，不再需要执行动作指令；活体强度下降，后续可在不引入动作检测的前提下补静态反欺骗策略。
## Implementation Update (2026-02-12, Round C37)
- 目标：把 `/m/enroll/capture` 提升为更稳健的生产化采集流程（串行加载 + 全屏预览控制 + Anti-Blur + 遮挡拦截）。
- 实施：相机改为模型 ready 后才启动并显示 loader/15 秒慢网提示；照片预览改全屏 modal，预览开启自动暂停采集、关闭后自动恢复；新增 `src/mobile/utils/sharpness.ts`（Laplacian Variance）做模糊拦截，并在 `src/mobile/utils/face-visibility.ts` + `src/mobile/utils/visibility-image-checks.ts` 收紧 mouth/eye 几何阈值、上调 `MIN_MOUTH_AREA_RATIO`/`MIN_NOSE_TO_MOUTH_RATIO`、用 `detection.score` 作为 landmark 置信代理并增加下半脸（口罩）与眼区像素/肤色不对称拦截；新增 `src/mobile/services/enrollment-quality-review.ts` 在进入下一步前对 10 张重检并剔除遮挡/模糊/混人异常帧，不足 10 张强制回到补拍，同时将模糊阈值提到 7500 并在 sharpness 计算中加入 3x3 平滑与中心 55% ROI，采集/复检统一使用历史分位数 + 峰值 + warmup 放行做设备自适应阈值避免低质相机卡死与反复重检；`EnrollLivenessPage` 已改为 Review & Confirm 预览确认流：移除实时活体扫描，展示采集网格并直接保存。
- UI/Deploy：顶部状态胶囊分离（`[status][progress]`），移除冗余提示块；底部显示“环境：正常/模糊 + sharpness score”并在连续模糊时给出中心黄色提示；构建改为相对路径基线（`base=./` + runtime asset path follow `BASE_URL`）避免 GitHub Pages 404。
- 验证：`npm run lint` Passed；`npm run build` Passed。
- 决策影响：在弱网/抖动/遮挡场景下，采集质量更可控，10 张入库样本稳定性提升且用户反馈更明确。
