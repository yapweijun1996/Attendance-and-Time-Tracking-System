# Sprint 2 Page Task Breakdown (Execution Pack)

- Version: 1.0
- Date: 2026-02-12
- Owner: Tech Lead
- Source: `PRD.md` Sprint 2 + `docs/Layout_v1.md`

## Attention Points (AP)
1. MUST 以 Sprint 2 范围为主：Geofence、Evidence、Sync、Idempotency。
2. MUST 保持移动端单任务流：`Home -> Verify -> Result`。
3. MUST 控制推理与相机资源占用，避免常驻 GPU/CPU 压力。
4. MUST 每个页面任务包含 DoD 与终端验证命令，支持工程落地。

## Dependency Tree
- S2-P2 (`/m/verify`) 依赖 S2-P1 (`/m/home`) 触发入口。
- S2-P3 (`/m/result`) 依赖 S2-P2 产出事件结果。
- S2-P4 (`/m/history`) 依赖 S2-P2 事件落库与同步状态更新。
- S2-P5 (`/admin/settings`) 依赖策略类型与持久化接口。
- S2-P6 (`/admin/logs`) 依赖 S2-P2 事件字段完整性与 Evidence 附件。

## Known Pitfalls
- 模型或运行时资源未就绪会导致 Verify 首次进入等待过久。
- GPS 拒绝权限是常态，不应阻断打卡，必须标记 `LOCATION_UNAVAILABLE`。
- Evidence 附件体积失控会拖慢 sync，必须 enforce 压缩策略。
- 若未统一 `syncState` 枚举与 badge 文案，跨页状态会出现不一致。

## S2-P1 - Mobile Home `/m/home`
### Context & Goal (背景与目标)
- Goal: 建立 Staff 的统一入口，提供 IN/OUT 主操作与同步状态感知。
- Why: Sprint 2 的 Verify/Evidence/Sync 全部由该页触发，入口稳定性直接影响漏打卡率。

### Technical Spec (技术规格)
- Logic:
  - MUST 渲染两个主按钮：`Time In`、`Time Out`。
  - MUST 显示网络状态与最近同步状态（`LOCAL_ONLY/SYNCING/SYNCED`）。
  - MUST 在 `enrollStatus != ACTIVE` 时禁用主按钮并展示引导。
  - SHOULD 显示最近 3 条本地记录摘要。
- Interface:
  - Route: `/m/home`
  - Events:
    - `onTapIn() -> navigate('/m/verify?action=IN')`
    - `onTapOut() -> navigate('/m/verify?action=OUT')`
  - Required Data:
    - `enrollStatus`
    - `latestSyncState`
    - `recentLogs[0..2]`

### Definition of Done (DoD)
- 页面可在移动端 390px 宽度稳定展示且无横向滚动。
- `IN/OUT` 点击可正确携带 action 参数进入 Verify。
- 未 enrollment 状态下按钮不可点击，提示文案正确。
- Sync badge 与数据层 `syncState` 值一一对应。

### Security & Constraints (安全与约束)
- MUST 不在此页启动相机与模型加载。
- MUST 不展示 Evidence 图片。
- SHOULD 限制动画为轻量 transition（<= 150ms）。

### Verification (验证方法)
- `npm run lint`
- `npm run build`
- `rg -n "m/home|verify\\?action" src`
- 手动：打开 `/m/home`，点击 `Time In/Out`，URL 必须带 `action` 参数。

## S2-P2 - Mobile Verify `/m/verify`
### Context & Goal (背景与目标)
- Goal: 完成 1:1 验证 + GPS + Evidence 生成 + 本地写入，支持离线。
- Why: 这是 Sprint 2 核心价值点，决定 geofence、evidence、sync 数据质量。

### Technical Spec (技术规格)
- Logic:
  - MUST 进入页面后才加载人脸模型与相机流。
  - MUST 执行 1:1 descriptor 比对，读取阈值策略。
  - MUST 采集 GPS 并计算 geofence，拒绝定位时标记 `LOCATION_UNAVAILABLE`。
  - MUST 在验证成功后生成水印 evidence 并写入本地事件。
  - MUST 写入 `eventId`、`clientTs`、`syncState=LOCAL_ONLY`。
  - SHOULD 在离页/成功后立即释放相机流。
- Interface:
  - Route: `/m/verify?action=IN|OUT`
  - Service calls:
    - `faceAPIService.loadModels()`
    - `faceAPIService.detectFace()`
    - `pouchDBService.put(attendanceLog)`
  - Required fields:
    - `eventId, action, verify, gps, geoPolicyResult, _attachments.evidence.jpg`

### Definition of Done (DoD)
- 成功路径可在离线状态下 2 秒内显示提交完成反馈。
- GPS denied 时事件仍可入库，且 geo 状态为 `LOCATION_UNAVAILABLE`。
- Evidence 附件可写入本地文档且含水印元数据。
- 页面离开后摄像头指示灯关闭（stream 已释放）。

### Security & Constraints (安全与约束)
- MUST 不持久化原始 profile face image，仅允许 descriptor 与 evidence 附件。
- MUST 记录失败原因但避免写入敏感原始帧到日志。
- SHOULD 采用压缩策略保证 evidence P95 <= 200KB。

### Verification (验证方法)
- `npm run lint`
- `npm run build`
- `rg -n "LOCATION_UNAVAILABLE|eventId|_attachments|syncState" src`
- 手动：禁用网络后打卡一次，检查本地日志 `syncState=LOCAL_ONLY`。
- 手动：拒绝定位权限后打卡，检查 geo 状态为 `LOCATION_UNAVAILABLE`。

## S2-P3 - Mobile Result `/m/result`
### Context & Goal (背景与目标)
- Goal: 对本次事件给出确定反馈与失败原因，降低重复点击和误报工单。
- Why: Sprint 2 引入更多异常分支，必须把系统状态解释清楚。

### Technical Spec (技术规格)
- Logic:
  - MUST 展示成功/失败状态、action、clientTs、geoStatus、syncState。
  - MUST 对 `cooldown/mismatch/permission/not-enrolled` 提供差异化文案。
  - SHOULD 提供两个 CTA：返回主页、查看历史。
- Interface:
  - Route: `/m/result`
  - Input model:
    - `resultStatus`
    - `reasonCode`
    - `eventSummary`

### Definition of Done (DoD)
- 8 类核心状态码均有映射文案（成功 + 7 种失败/异常）。
- 页面刷新后不出现空白崩溃（可回退到 `/m/home`）。
- 用户可一键返回主操作页继续工作流。

### Security & Constraints (安全与约束)
- MUST 不在结果页回放相机画面。
- MUST 不直接展示 Evidence 原图。
- SHOULD 文案简短，单屏可读。

### Verification (验证方法)
- `npm run lint`
- `npm run build`
- `rg -n "cooldown|mismatch|not-enrolled|permission" src`
- 手动：模拟 cooldown，再次打卡后进入 Result，检查文案与剩余秒数。

## S2-P4 - Mobile History `/m/history`
### Context & Goal (背景与目标)
- Goal: 让 Staff 可自查个人打卡记录与同步状态，减少 HR 人工查询。
- Why: Sprint 2 有 `LOCAL_ONLY -> SYNCED` 状态转换，需可见化。

### Technical Spec (技术规格)
- Logic:
  - MUST 支持按日期范围查看个人记录。
  - MUST 显示 action、clientTs、serverTs、geoStatus、syncState。
  - MUST 区分 `LOCAL_ONLY/SYNCING/SYNCED` 状态徽章。
  - SHOULD 支持空列表提示和重试按钮。
- Interface:
  - Route: `/m/history`
  - Query:
    - `from`, `to`
  - Data source:
    - Local Pouch first, then merged sync updates

### Definition of Done (DoD)
- Staff 可看到最近 30 天记录且列表滚动流畅。
- 离线状态下仍可查看本地已写入记录。
- `serverTs` 缺失时显示占位且不影响渲染。

### Security & Constraints (安全与约束)
- MUST 默认不显示 evidence 缩略图。
- MUST 仅显示当前登录 staffId 数据。
- SHOULD 分页或虚拟滚动，避免长列表卡顿。

### Verification (验证方法)
- `npm run lint`
- `npm run build`
- `rg -n "syncState|serverTs|history" src`
- 手动：离线打卡后进入 History，确认可见 `LOCAL_ONLY` 记录。

## S2-P5 - Admin Settings Lite `/admin/settings`
### Context & Goal (背景与目标)
- Goal: 提供 Sprint 2 必要策略配置入口（地理围栏与证据策略）。
- Why: 无配置入口会导致 geofence/evidence 只能写死，无法满足不同站点策略。

### Technical Spec (技术规格)
- Logic:
  - MUST 支持编辑并保存以下字段：
    - `verificationThreshold`
    - `cooldownSec`
    - `evidencePolicy.maxWidth/jpegQuality/maxPerEvent`
    - `retention.localDays/serverDays`
  - MUST 对范围值做前端校验并给错误提示。
  - SHOULD 支持恢复默认配置。
- Interface:
  - Route: `/admin/settings`
  - DTO:
    - `POLICY_CONFIG`
  - Actions:
    - `loadPolicy()`
    - `savePolicy(patch)`

### Definition of Done (DoD)
- 所有策略项可读可写，保存后可被 Verify 流程读取到。
- 非法输入被阻断并显示字段级错误。
- 保存行为写入审计日志（至少本地事件）。

### Security & Constraints (安全与约束)
- MUST 仅 Admin 可访问。
- MUST 对数值字段做边界限制，防止极端配置破坏性能。
- SHOULD 以分组表单减少误配置。

### Verification (验证方法)
- `npm run lint`
- `npm run build`
- `rg -n "POLICY_CONFIG|verificationThreshold|cooldownSec|retention" src`
- 手动：把阈值改小后打卡，验证匹配判定按新阈值生效。

## S2-P6 - Admin Logs Lite `/admin/logs`
### Context & Goal (背景与目标)
- Goal: 在 Sprint 2 提供最小可用日志视图，验证 geofence/evidence/sync 数据完整性。
- Why: 若无管理视图，无法快速验收 evidence 与同步字段是否正确产出。

### Technical Spec (技术规格)
- Logic:
  - MUST 展示字段：staffId/action/clientTs/serverTs/geoStatus/syncState/evidenceRef。
  - MUST 支持异常筛选：`OUT_OF_RANGE`、`LOCATION_UNAVAILABLE`。
  - MUST 支持 evidence 预览抽屉（仅 Admin）。
  - SHOULD 支持分页（默认 25 条）。
- Interface:
  - Route: `/admin/logs`
  - Query filters:
    - `dateRange`, `staffId`, `geoStatus`, `action`

### Definition of Done (DoD)
- 管理端可检索到 Staff 端新产生事件并查看关键字段。
- Evidence 抽屉可打开并显示元数据（时间、设备、地理状态）。
- 过滤条件可组合使用，返回结果准确。

### Security & Constraints (安全与约束)
- MUST 非 Admin 禁止访问此页。
- MUST evidence URL/attachment 访问受权限保护。
- SHOULD 对图片预览使用惰性加载，避免表格滚动卡顿。

### Verification (验证方法)
- `npm run lint`
- `npm run build`
- `rg -n "admin/logs|OUT_OF_RANGE|LOCATION_UNAVAILABLE|evidence" src`
- 手动：用非 Admin 身份访问 `/admin/logs`，应被拦截。

## Sprint 2 Exit Gate (页面层)
1. MUST `S2-P1` 至 `S2-P4` 完成并通过手动流程串测一次。
2. MUST 至少完成 `S2-P5` 或提供等价配置来源（非硬编码）。
3. SHOULD 完成 `S2-P6` 以提前暴露数据质量问题，若延期需登记风险。
4. MUST 运行并通过：
   - `npm run lint`
   - `npm run build`

