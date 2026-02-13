# SATTS Layout v1 (MVP)

- Version: 1.0
- Date: 2026-02-12
- Owner: Tech Lead / Product
- Source of Truth: `PRD.md v1.1`

## Attention Points (AP)
1. MUST 保证 Staff 主流程为单任务路径（打卡 -> 验证 -> 结果），避免多入口造成误操作。
2. MUST 将相机与模型加载限制在 Enrollment/Verify 页面，离开页面立即释放流，降低 CPU/GPU 压力。
3. MUST 在 UI 显示离线与同步状态，保证“可离线创建事件”的预期一致。
4. MUST 对 Evidence 与 Audit 做角色隔离，Staff 默认不可查看证据图。

## 1. Context & Goal (背景与目标)
- Why:
  - 现有 PRD 已定义功能与数据契约，但尚缺“页面级结构 + 状态 + 验收”的前端落地蓝图。
  - Sprint 2/3 将并行推进证据、同步、Admin，必须先统一 IA 与布局骨架，避免返工。
- Goal:
  - 产出可开发的 Layout v1，覆盖 Mobile Staff 与 PC Admin 的 MVP 全链路。
  - 输出内容可直接转为页面任务与组件任务。

## 2. Scope / Non-Scope
- In Scope (MVP):
  - Staff Mobile: Home, Verify, Result, Enrollment, History, Profile。
  - Admin PC: Logs, Staff, Settings, Exports, Audit, Evidence Viewer。
  - 状态定义: loading/empty/error/offline/permission/cooldown/sync。
- Out of Scope:
  - Kiosk 1:N 识别（Phase 4）。
  - Manager 专属页面（Phase 3）。
  - 复杂排班/审批引擎。

## 3. IA & Navigation (信息架构)
### 3.1 Staff Mobile Routes
- `/m/home`：打卡主页（Time In / Time Out）
- `/m/verify`：人脸验证与 GPS 捕获
- `/m/result`：本次打卡结果与原因提示
- `/m/enroll/consent`：同意书
- `/m/enroll/capture`：20 角度采集
- `/m/enroll/liveness`：活体挑战
- `/m/history`：个人记录
- `/m/profile`：账号与设备状态

### 3.2 Admin PC Routes
- `/admin/logs`：打卡日志（主工作台）
- `/admin/staff`：员工列表与重置 Face ID
- `/admin/settings`：阈值/冷却/证据/保留策略
- `/admin/exports`：CSV 导出
- `/admin/audit`：管理员行为审计

### 3.3 Navigation Layout
- Mobile:
  - Top: 状态条（网络、syncState、最近 serverTs）。
  - Main: 主操作卡片（双按钮）。
  - Bottom Tab: Home / History / Profile。
- Admin:
  - Left Sidebar: Logs, Staff, Settings, Exports, Audit。
  - Top Toolbar: 全局筛选与组织/日期上下文。
  - Content: 表格 + 右侧抽屉（Evidence/Metadata）。

## 4. Screen Layout Spec (页面结构规格)
### M-01 Home (Staff)
- Layout Blocks:
  - Header: 今日日期、同步状态徽章、离线提示。
  - Action Zone: `Time In` (绿色) + `Time Out` (红色) 大按钮。
  - Recent Zone: 最近 3 条记录与状态标签。
- Primary Action:
  - 点击 IN/OUT -> 跳转 `/m/verify?action=IN|OUT`。
- Notes:
  - 若 `enrollStatus != ACTIVE`，主按钮禁用并显示 Re-enroll 引导。

### M-02 Verify (Staff)
- Layout Blocks:
  - Camera viewport（4:3）+ 简短引导文案。
  - 状态行：模型状态、GPS 状态、网络状态。
  - Secondary action: Cancel。
- Runtime Rules:
  - 进入页面才加载模型与相机。
  - 识别完成立即释放相机流并写本地事件。

### M-03 Result (Staff)
- Layout Blocks:
  - Result Icon + 标题（Success/Failed）。
  - 关键信息：action、clientTs、geoStatus、syncState。
  - CTA: 返回主页 / 查看历史。
- Error Messaging:
  - mismatch / cooldown / permission denied / not enrolled 分开文案。

### M-04 Enrollment (Staff)
- Consent:
  - 显示 version 与条款摘要，必须主动勾选同意。
- Capture 20 Angles:
  - 圆形进度环 + 角度提示（正面/左/右/抬头/低头）。
- Liveness:
  - 随机 challenge（blink/smile/head-turn）+ 通过反馈。

### M-05 History (Staff)
- Layout:
  - 日期筛选 + 记录列表（action/time/geo/sync）。
  - 默认不展示 evidence 缩略图（降低带宽与权限风险）。

### A-01 Logs (Admin)
- Layout:
  - Filter Bar: date range/staff/dept/status/action。
  - Data Grid: staffId/name/action/serverTs/clientTs/geo/sync/dedupe。
  - Right Drawer: evidence + metadata。
- Behavior:
  - 支持分页与排序。
  - 异常标签可一键过滤（OUT_OF_RANGE、LOCATION_UNAVAILABLE、LATE）。

### A-02 Staff (Admin)
- Layout:
  - Staff 列表 + 详情抽屉。
  - 关键操作：`Reset Face ID`（二次确认）。

### A-03 Settings (Admin)
- Sections:
  - Verification threshold
  - Cooldown seconds
  - Evidence policy (maxWidth/jpegQuality/maxPerEvent)
  - Retention policy (localDays/serverDays)

### A-04 Exports (Admin)
- Layout:
  - 导出参数面板 + 最近导出历史。
  - 点击导出必须写入审计日志。

### A-05 Audit (Admin)
- Layout:
  - 审计表（actor/action/target/ts/result）。
  - 支持 action 类型筛选（export/reset/policy-change）。

## 5. State Matrix (关键状态表)
| Screen | Loading | Empty | Error | Offline | Permission |
|---|---|---|---|---|---|
| M-01 Home | 拉取本地今日摘要 | 无记录 | 配置缺失 | 显示 LOCAL_ONLY 提示 | 未 enrollment 禁用打卡 |
| M-02 Verify | 模型加载中 | 无 descriptor | 摄像头/GPS 失败 | 允许继续并标记 | Camera/GPS denied 明确提示 |
| M-03 Result | 写入/压缩中 | - | 写入失败可重试 | 成功但 `LOCAL_ONLY` | - |
| M-05 History | 列表加载 | 空清单 | 查询失败 | 可看本地记录 | evidence 默认不可见 |
| A-01 Logs | 分页/筛选加载 | 无匹配记录 | 拉取失败 | 显示同步延迟提示 | 非 Admin 禁入 |
| A-04 Exports | 生成中 | 无可导出数据 | 导出失败 | 不允许离线导出 | 非授权角色禁用 |

## 6. Validation & Interaction Rules
1. Cooldown:
   - 同 action 在 300 秒内再次提交 -> 阻断并提示剩余秒数。
2. Geofence:
   - GPS unavailable 不阻断打卡，但标记 `LOCATION_UNAVAILABLE`。
3. Conflict:
   - `RESET_REQUIRED` / `LOCKED` 时阻断打卡并跳转 enrollment 引导。
4. Evidence:
   - 成功验证后才采集并加水印；压缩失败需给重试按钮。
5. Sync:
   - `LOCAL_ONLY`、`SYNCING`、`SYNCED` 需有统一徽章样式。

## 7. UI System & Performance Constraints
- MUST:
  - 动画时长 <= 150ms，避免持续高频动画。
  - 非验证页不得持有 camera stream。
  - 图像缩略图默认懒加载，列表优先文本渲染。
- SHOULD:
  - 移动端验证页使用单列布局，减少重绘区域。
  - 管理后台表格启用分页，单页默认 25 条。

## 8. Acceptance Criteria (Given / When / Then)
1. Given Staff 已完成 enrollment，When 在离线状态点 Time In，Then 2 秒内看到成功结果且 `syncState=LOCAL_ONLY`。
2. Given Staff 在 5 分钟冷却内重复同 action，When 再次点击，Then 阻断并显示 cooldown 文案。
3. Given GPS 被拒绝，When 打卡成功，Then 记录 `LOCATION_UNAVAILABLE` 且不丢事件。
4. Given Admin 打开 Logs，When 过滤 `OUT_OF_RANGE`，Then 仅显示匹配日志并可查看 evidence 抽屉。
5. Given 非 Admin 角色访问 `/admin/logs`，When 进入页面，Then 跳转未授权页并记录审计。
6. Given Admin 触发 CSV 导出，When 导出完成，Then 审计日志新增 export 记录。
7. Given Profile 被设置 `RESET_REQUIRED`，When Staff 尝试打卡，Then 阻断并引导到 enrollment。
8. Given 网络恢复，When replication 开始，Then `LOCAL_ONLY` 事件在 15 分钟内转为 `SYNCED`（99%）。

## 9. Handoff Component Inventory
- Layout: `MobileShell`, `AdminShell`, `Sidebar`, `TopStatusBar`
- Attendance: `ActionButtonPair`, `VerifyCameraPanel`, `ResultCard`, `SyncBadge`
- Enrollment: `ConsentCard`, `CaptureProgressRing`, `LivenessChallengeCard`
- Admin: `LogFilterBar`, `AttendanceTable`, `EvidenceDrawer`, `ExportPanel`, `AuditTable`

## 10. Implementation Sequence (建议)
1. Stage 1: `MobileShell + M-01/M-03`（不接真实识别，先连本地事件 mock）。
2. Stage 2: `M-02 Verify` 接现有 `face/db/camera` 服务。
3. Stage 3: `AdminShell + A-01 Logs + EvidenceDrawer`。
4. Stage 4: `A-02/A-03/A-04/A-05` 与 RBAC/Audit 闭环。
