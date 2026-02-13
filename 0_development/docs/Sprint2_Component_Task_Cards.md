# Sprint 2 Component Task Cards (0.5~1 Day)

- Version: 1.0
- Date: 2026-02-12
- Owner: Tech Lead
- Inputs:
  - `docs/Layout_v1.md`
  - `docs/Sprint2_Page_Task_Breakdown.md`

## Attention Points (AP)
1. MUST 组件任务与页面任务一一映射，避免“做了组件但页面不可交付”。
2. MUST 每张卡包含 DoD + 终端验证命令，支持开发与 QA 串联。
3. MUST Verify 相关任务优先处理性能与资源释放，降低 CPU/GPU 压力。
4. MUST Admin 相关任务默认走 RBAC 保护。

## 角色建议（可按团队实际替换）
- FE-M: 移动端主责（Home/Verify/Result/History）
- FE-A: 后台主责（Settings/Logs/Evidence Drawer）
- FS: 跨端共享组件与策略读写接口（SyncBadge/RouteGuard/Policy）

## Dependency Tree
- C01 -> C02 -> C04 -> C05 -> C06 -> C07 -> C08
- C09 -> C10 + C11 -> C12
- C03, C13, C14 为共享能力，可并行但需在页面联调前完成

## C01 - Mobile Shell & Route Scaffold
- Page: S2-P1/S2-P2/S2-P3/S2-P4
- Estimate: 0.5 day
- Owner Suggestion: FE-M
### Context & Goal
- 建立移动端路由骨架与底部导航，打通 `home/verify/result/history` 页面跳转。
### Technical Spec
- Logic: MUST 建立 `/m/*` 路由与基础布局容器；SHOULD 支持返回栈。
- Interface: `MobileShell`, `MobileTabBar`, route definitions。
### DoD
- 四个页面路由可访问且互跳正常。
- 390px 宽度无横向滚动。
### Security & Constraints
- MUST 不在 Shell 层初始化相机/模型。
### Verification
- `npm run lint`
- `npm run build`
- `rg -n "/m/home|/m/verify|/m/result|/m/history" src`

## C02 - Home Action Button Pair
- Page: S2-P1
- Estimate: 0.5 day
- Owner Suggestion: FE-M
### Context & Goal
- 实现 Time In/Time Out 双主按钮与动作分发。
### Technical Spec
- Logic: MUST 输出 `action=IN|OUT` 参数跳转 Verify；SHOULD 有禁用态。
- Interface: `ActionButtonPair({ disabled, onIn, onOut })`。
### DoD
- `IN/OUT` 点击后 URL 含正确 action 参数。
- `enrollStatus != ACTIVE` 时按钮禁用。
### Security & Constraints
- MUST 仅处理导航，不触发数据库写入。
### Verification
- `npm run lint`
- `rg -n "ActionButtonPair|action=IN|action=OUT" src`

## C03 - Home Status Strip & Recent Logs
- Page: S2-P1
- Estimate: 0.5 day
- Owner Suggestion: FE-M
### Context & Goal
- 展示网络/同步状态与最近 3 条记录，增强离线可感知性。
### Technical Spec
- Logic: MUST 渲染 `LOCAL_ONLY/SYNCING/SYNCED`；SHOULD 展示最近 3 条摘要。
- Interface: `TopStatusBar`, `RecentLogList`。
### DoD
- Sync 状态与数据枚举一致。
- 离线时显示明显提示。
### Security & Constraints
- MUST 不显示 evidence 缩略图。
### Verification
- `npm run lint`
- `rg -n "LOCAL_ONLY|SYNCING|SYNCED|RecentLogList" src`

## C04 - Verify Runtime Gate (Camera + Model Lifecycle)
- Page: S2-P2
- Estimate: 1.0 day
- Owner Suggestion: FE-M
### Context & Goal
- 控制 Verify 页资源生命周期，确保进入才加载、离开即释放。
### Technical Spec
- Logic: MUST 进入页面启动模型与相机；MUST 成功/离页释放流；SHOULD 显示加载阶段。
- Interface: `VerifyCameraPanel`, `useVerifyRuntime()`。
### DoD
- 离开 Verify 后摄像头关闭。
- 模型状态可见（loading/ready/error）。
### Security & Constraints
- MUST 避免后台标签页持续推理。
### Verification
- `npm run lint`
- `npm run build`
- `rg -n "loadModels|stop\\(|MediaStream|VerifyCameraPanel" src`

## C05 - Verify Geofence Evaluator
- Page: S2-P2
- Estimate: 0.5 day
- Owner Suggestion: FE-M
### Context & Goal
- 完成 GPS 捕获与 geofence 判定，统一 geo 状态输出。
### Technical Spec
- Logic: MUST 输出 `IN_RANGE/OUT_OF_RANGE/LOCATION_UNAVAILABLE`。
- Interface: `evaluateGeofence(gps, officePolicy)`。
### DoD
- GPS denied 不阻断打卡并标记 `LOCATION_UNAVAILABLE`。
- 距离与状态字段写入事件对象。
### Security & Constraints
- MUST 仅存储必要定位字段（lat/lng/accuracyM）。
### Verification
- `npm run lint`
- `rg -n "IN_RANGE|OUT_OF_RANGE|LOCATION_UNAVAILABLE|distanceM" src`

## C06 - Verify Evidence Pipeline
- Page: S2-P2
- Estimate: 1.0 day
- Owner Suggestion: FE-M + FS
### Context & Goal
- 成功验证后生成水印 evidence 并写入附件，控制体积。
### Technical Spec
- Logic: MUST 生成 JPEG 附件并注入水印元数据；SHOULD 按策略压缩。
- Interface: `buildEvidenceAttachment(frame, meta, policy)`。
### DoD
- `_attachments.evidence.jpg` 正确写入本地文档。
- evidence 体积满足策略阈值（目标 P95 <= 200KB）。
### Security & Constraints
- MUST 不保存 profile raw image。
- MUST 限制失败日志，不打印敏感图像数据。
### Verification
- `npm run lint`
- `rg -n "_attachments|evidence.jpg|jpegQuality|maxWidth" src`

## C07 - Verify Event Writer (Idempotency Baseline)
- Page: S2-P2
- Estimate: 0.5 day
- Owner Suggestion: FS
### Context & Goal
- 统一生成 `eventId/clientTs/syncState` 并落本地，支撑后续同步。
### Technical Spec
- Logic: MUST 写入 `eventId(UUID)`、`clientTs`、`syncState=LOCAL_ONLY`。
- Interface: `createAttendanceEvent(input): AttendanceLog`。
### DoD
- 每次成功打卡都产出唯一 eventId。
- 本地事件对象字段满足 Sprint 2 最小契约。
### Security & Constraints
- MUST 避免重复提交造成 UI 多次写入。
### Verification
- `npm run lint`
- `rg -n "eventId|clientTs|syncState|LOCAL_ONLY" src`

## C08 - Result State Mapper
- Page: S2-P3
- Estimate: 0.5 day
- Owner Suggestion: FE-M
### Context & Goal
- 建立结果页状态码到文案映射，减少用户误解。
### Technical Spec
- Logic: MUST 覆盖 success + 常见失败码（cooldown/mismatch/permission/not-enrolled）。
- Interface: `mapResultMessage(reasonCode)`。
### DoD
- 8 类状态均有文案映射。
- 刷新页面时可回退到 Home，不白屏。
### Security & Constraints
- MUST 不展示 evidence 原图。
### Verification
- `npm run lint`
- `rg -n "mapResultMessage|cooldown|mismatch|not-enrolled|permission" src`

## C09 - History List & Sync Badge
- Page: S2-P4
- Estimate: 0.5 day
- Owner Suggestion: FE-M
### Context & Goal
- 展示 30 天记录与同步状态，支持离线查询。
### Technical Spec
- Logic: MUST 显示 `action/clientTs/serverTs/geoStatus/syncState`。
- Interface: `HistoryList`, `SyncBadge`。
### DoD
- 离线创建的记录可立即在 History 显示。
- `serverTs` 为空时展示占位。
### Security & Constraints
- MUST 仅显示当前 staff 数据。
### Verification
- `npm run lint`
- `rg -n "HistoryList|SyncBadge|serverTs|geoStatus" src`

## C10 - Admin Shell & Route Guard
- Page: S2-P5/S2-P6
- Estimate: 0.5 day
- Owner Suggestion: FE-A + FS
### Context & Goal
- 搭建 Admin 路由壳与基础权限拦截。
### Technical Spec
- Logic: MUST 非 Admin 拦截 `/admin/*`；SHOULD 提供未授权页。
- Interface: `AdminShell`, `RouteGuard`。
### DoD
- Admin 可访问 settings/logs；非 Admin 被拒绝。
- 侧栏菜单与路由一致。
### Security & Constraints
- MUST RBAC 默认拒绝策略。
### Verification
- `npm run lint`
- `rg -n "AdminShell|RouteGuard|/admin/settings|/admin/logs" src`

## C11 - Settings Policy Form
- Page: S2-P5
- Estimate: 1.0 day
- Owner Suggestion: FE-A
### Context & Goal
- 提供策略配置表单，驱动 Verify 行为可调。
### Technical Spec
- Logic: MUST 支持阈值、cooldown、evidence、retention 编辑与保存。
- Interface: `PolicyForm`, `loadPolicy`, `savePolicy`。
### DoD
- 非法输入被阻断并显示字段错误。
- 保存后 Verify 流程读取新配置生效。
### Security & Constraints
- MUST 限制数值边界，防止性能异常配置。
### Verification
- `npm run lint`
- `rg -n "PolicyForm|verificationThreshold|cooldownSec|retention|evidencePolicy" src`

## C12 - Logs Grid & Filter Bar
- Page: S2-P6
- Estimate: 1.0 day
- Owner Suggestion: FE-A
### Context & Goal
- 建立管理日志表格与筛选，支持异常排查。
### Technical Spec
- Logic: MUST 展示核心字段并支持 `OUT_OF_RANGE/LOCATION_UNAVAILABLE` 筛选。
- Interface: `AttendanceTable`, `LogFilterBar`。
### DoD
- 可组合筛选且结果正确。
- 默认分页 25 条可切页。
### Security & Constraints
- MUST 不在表格中直接暴露原始附件数据。
### Verification
- `npm run lint`
- `rg -n "AttendanceTable|LogFilterBar|OUT_OF_RANGE|LOCATION_UNAVAILABLE" src`

## C13 - Evidence Drawer (Admin Only)
- Page: S2-P6
- Estimate: 0.5 day
- Owner Suggestion: FE-A
### Context & Goal
- 提供日志侧边抽屉查看证据图与元数据。
### Technical Spec
- Logic: MUST 仅 Admin 可打开 evidence；SHOULD 惰性加载图片。
- Interface: `EvidenceDrawer({ logId })`。
### DoD
- 点击日志行可打开抽屉并显示 metadata。
- 非 Admin 无法触发抽屉。
### Security & Constraints
- MUST evidence 访问受权限控制。
### Verification
- `npm run lint`
- `rg -n "EvidenceDrawer|evidence|metadata" src`

## C14 - Shared Sync Badge Standardization
- Page: S2-P1/S2-P3/S2-P4/S2-P6
- Estimate: 0.5 day
- Owner Suggestion: FS
### Context & Goal
- 统一跨页 syncState 颜色、文案、优先级，避免认知不一致。
### Technical Spec
- Logic: MUST 统一 `LOCAL_ONLY/SYNCING/SYNCED/FAILED` 映射。
- Interface: `SyncBadge({ state })` shared component。
### DoD
- 四个页面使用同一组件渲染同步状态。
- 新增状态时只改一处映射即可生效。
### Security & Constraints
- MUST 不泄漏内部错误细节给 Staff。
### Verification
- `npm run lint`
- `rg -n "SyncBadge\\(|LOCAL_ONLY|SYNCING|SYNCED|FAILED" src`

## Sprint 2 Component Exit Gate
1. MUST `C01~C09` 完成后串测移动端主流程一次（离线/定位拒绝/cooldown）。
2. MUST `C10~C13` 完成后串测 Admin 权限与 evidence 访问控制。
3. MUST 执行并通过：
   - `npm run lint`
   - `npm run build`
4. SHOULD 将未完成组件卡登记到下轮 backlog，并标注风险影响。
