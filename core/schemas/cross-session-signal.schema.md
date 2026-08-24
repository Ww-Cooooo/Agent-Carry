# 统一触发与跨会话信号 Schema 1.1

本 Schema 定义事务控制记录、动态状态卡、极小唤醒胶囊、非启动时间索引，以及正式资产上的可选触发字段。全部使用 TOML 或 Markdown TOML frontmatter；不要求数据库、后台服务或特定宿主 API。

## 1. 控制记录

当前入口由 `assistant.toml` 的 `[signals]` 声明：

`startup_reads` 只能列出控制记录与 `instance/maps/signal-map.toml` 唤醒胶囊；`projections` 是事务完成前必须共同更新的派生输出集合，不是启动读取清单。`time_projection_load_policy` 必须明确：只有唤醒胶囊的 `next_wakeup_at` 已到、用户明确查看日程或正在重建投影时，才读取非启动时间索引。宿主不得枚举 `source_root` 来判断是否有信号。

```toml
schema_version = 1
record_type = "cross-session-signal-control"
instance_id = "template"
source_revision = 0
projection_revision = 0
update_state = "clean"
pending_operation_id = ""
pending_event_id = ""
pending_signal_id = ""
pending_trigger_id = ""
pending_source_ref = ""
base_revision = 0
updated_at = ""
```

- `source_revision`：任何受统一事务管理的正式动态状态变化都单调增加。
- `projection_revision`：所有配置中声明的派生投影已经共同覆盖到的源修订。
- `update_state`：`clean`、`pending` 或 `recovery-required`。
- `pending_*`：只在更新尚未完整结束时保留；`clean` 时必须为空。
- `pending_signal_id`：兼容第一版单状态卡更新；新规则优先同时填写更通用的 `pending_trigger_id` 和 `pending_source_ref`。
- `base_revision`：操作开始前观察到的源修订，用于发现并发覆盖。
- `updated_at`：已知时使用带时区的 ISO 8601 时间；未知不伪造。

`clean` 时两个修订必须相等，并且所有声明投影可解析、引用有效。只要其中一个投影未完成，就不能提前清除 `pending`。

## 2. 动态状态卡

需要跨任务累计、但不适合直接写入目标资产 frontmatter 的状态使用独立 TOML 卡。推荐按评估类别存放在 `instance/signals/<family>/`，例如 `count/`、`health/`、`state/`；普通启动不得枚举这些目录。

```toml
schema_version = 1
record_type = "cross-session-signal"
id = "signal.replace-me"
signal_type = "memory-review"
evaluation_family = "count"
status = "observing"
title = "待判断的信号"
reason = "一句话说明为什么需要跨会话累计"
domain = "evolution-model"
route_id = "evolution-review"
revision = 1
created_at = ""
updated_at = ""
last_verified_at = ""
asset_refs = []
candidate_source_revision = 0
related_signal_ids = []
minimum_level = 2
confirmation = "risk-dependent"
provenance = "model-inference"
trust_state = "candidate"

[match]
asset_kind = "memory"
subject = ""
claim = ""
scope = []
conditions = []
aliases = []

[trigger]
mode = "domain-rule"
independent_event_count = 0
threshold_value = 0
progress_summary = ""
next_event = ""
next_check_at = ""

[[evidence]]
event_id = ""
event_source = ""
task_id = ""
context_id = ""
occurred_at = ""
source_kind = ""
source_ref = ""
independent = false
relation = "supporting"
summary = ""
```

### 必填语义

- `signal_type`：开放、版本化的语义类型，不能绑定按钮或命令。
- `evaluation_family`：`count`、`health`、`state`、`validity` 或未来兼容值；决定事件命中后只枚举哪个小范围。
- `status`：`observing`、`near-trigger`、`pending-review`、`conflict`、`uncertain`、`stale`、`resolved`、`rejected` 或 `archived`。
- `domain` 和 `route_id`：必须能通过正式地图进入目标规则。
- `revision`：本状态卡每次变化时单调增加。
- `asset_refs`：只用稳定 ID 引用正式资产或候选，不复制正文。
- `provenance` 与 `trust_state`：分别表达真实来源和当前信任处理状态，不能与资产成熟度混淆。

### 匹配与累计

`match` 先按资产类型、作用对象、核心主张、范围、条件和别名缩小同类候选。主题相同但核心主张或条件不同的状态不能强行合并。

学习类累计有一个更严格的前置条件：具体规律第一次出现、用户尚未选择“先观察”或“以后提醒我再决定”时，不能创建动态状态卡，也不能把 `title`、`reason`、`match`、`evidence.summary` 或其哈希／改写持久化；选择“不保存”、拒绝保存极小提醒记录或没有回应时，候选、正式资产、信号和提醒等语义写入均为零。“以后提醒我再决定”不是裸日程：该明确选择先建立最小、可撤销的候选正文与索引，再建立只引用候选 ID／修订的提醒，并当场说明取消方式。只有候选正文与候选索引都能回读合法观察授权（`observation_state=explicit` 且 `observation_basis=explicit-user` 或 `existing-approved-migration`）后，学习状态卡才可存在，并且 `asset_refs` 必须只引用该候选稳定 ID，`candidate_source_revision` 必须与候选 frontmatter 及候选索引一致；状态卡的匹配语义从候选索引按需取得，不再复制候选主张、标题、别名、范围或原话。对这类卡，`title` 和 `reason` 使用固定低敏产品文案，`match.subject`、`match.claim`、`match.scope`、`match.conditions`、`match.aliases` 与 `evidence.summary` 必须为空；事件只保留稳定去重 ID、来源类别、独立性和结果关系。授权缺失、撤销或修订不一致时失败关闭，定向重建或清理该信号后才能继续累计。无法从已获准候选稳定 ID 完成匹配时，本轮继续询问用户，不能用静默语义信号绕过授权。

- `trigger.mode`：`domain-rule`、`count`、`time`、`metric`、`conflict`、`explicit-user` 或未来兼容值。
- `independent_event_count`：兼容字段名；只统计由受信宿主回执区分出的不同任务观察。它是决定“是否值得请用户复核”的优先级信号，不是已验证成功的任务数。
- `threshold_value = 0`：由目标规则决定，不代表自动触发。
- `next_check_at`：只有确有独立提醒需求时填写；普通生命周期日期不能冒充提醒。
- `event_source + event_id`：共同标识一次事件；重试或重复回传必须复用。
- `task_id`：运行时根据受信宿主提供的稳定任务依据生成的不透明 ID，调用者不能直接填写。它决定是否增加 `independent_event_count`；同一宿主任务的重复修正、重试与原样回传必须生成同一 ID。宿主无法提供稳定任务依据时，该观察必须标为非独立，不推进计数。
- `context_id`：运行时根据受信宿主提供的实质使用情境依据生成的不透明 ID，与任务 ID 分开去重。一个新任务观察可以发生在已有情境中，因此可以增加任务观察数但不能制造新的情境；候选的 `distinct_context_count` 只按不同 `context_id` 去重。这个字段同样不是任务结果验证。
- `source_ref`：低敏证据回执 ID，不是文件路径、原始对话或外部正文。当前用户消息只作为宿主确认过的观察证据，不能增加 `successful_event_count` 或 `failed_event_count`；只有闭合的结果验证机制才能改变验证成功/失败计数。
- `event_source` 与 `source_kind` 的规范枚举以 `HOST_INTEGRATION` 为真源：`current-user`、`agent-carry-asset`、`connected-host-observation`、`host-collaborative-memory`、`model-inference`、`external-content`、`unknown`。新捕获、新宿主回执和 proposed bytes 只能写这些值。
- 1.3 旧记录中的 `connected-host-task` 只可在读取已有 signal 时单向归一化为 `connected-host-observation`；旧拼写 `host-collaboration-memory` 同样只可单向归一化为 `host-collaborative-memory`。旧别名不能由公开输入或新 producer 接受，不能再次写回，也不能作为第二套长期语义；同一事件用旧／新名字出现时按规范值去重。
- `relation`：`supporting`、`contradicting`、`neutral` 或 `superseding`。

学习计数卡的状态不是宿主自由填写：受信宿主回执区分出的 `supporting` 任务观察达到 `threshold_value` 后确定为 `pending-review`；`contradicting`／`superseding` 确定为 `conflict`；尚未达到门槛或只有 `neutral` 时保持 `observing`。用户消息仍只是观察，状态命中只决定是否请用户复核，不会把观察改写为验证成功；只有闭合的 `RESULT_VALIDATION` 证据才能改变成功或失败计数。

同一状态卡内的事件身份必须唯一。压缩后可用等价计数和代表性证据代替全部重复回执，但不能掩盖反例与冲突。

### 可选健康指标

健康类状态可以增加：

```toml
[metric]
name = "formal_asset_count"
value = 0
unit = "assets"
operator = "gte"
threshold = 1000
window = "current-instance"
```

指标只在相关操作发生时更新。未知 `operator`、单位或窗口不得静默解释；阈值命中只启动领域评估，不自动执行升级。

## 3. 极小唤醒胶囊

`instance/maps/signal-map.toml` 仍保留兼容路径，但其职责收窄为启动唤醒胶囊：

```toml
schema_version = 1
map_id = "cross-session-signals"
instance_id = "template"
state = "current"
source_revision = 1
generated_at = "2026-08-14T20:10:33+08:00"
budget_bytes = 1536
overflow = false
active_count = 0
scheduled_count = 3
next_wakeup_at = "2027-02-10T00:00:00+08:00"
next_wakeup_ref = "instance/maps/time-trigger-map.toml"
```

必要时添加短路线：

```toml
[[signals]]
id = "signal.example"
signal_type = "memory-review"
status = "pending-review"
reason = "已达到记忆整理检查条件"
progress = "3 个宿主区分出的任务观察"
next_event = "用户选择后读取记忆整理规则"
domain = "evolution-model"
route_id = "evolution-review"
source_ref = "instance/signals/count/signal.example.toml"
source_signal_revision = 3
provenance = "user-explicit"
trust_state = "candidate"
minimum_level = 2
confirmation = "risk-dependent"
```

地图级要求：

- `state`：`current`、`empty`、`stale`、`uncertain`、`overflow` 或 `rebuild-required`。
- `source_revision` 必须与控制记录的 `projection_revision` 一致。
- `active_count` 必须等于实际 `signals` 条目数；未来定时项不计入它。
- `scheduled_count` 是所有有效时间项总数，不携带各项内容。
- `next_wakeup_at` 是所有有效时间项最早的 `effective_check_at`；没有定时项时为空。
- `next_wakeup_ref` 只指向一个非启动时间索引；普通启动在日期未到时不得读取它。
- `budget_bytes` 从配置读取；当前母版的启动封闭预算为 1536 UTF-8 字节，实际文件不得静默超限。达到上限时只保留领域级聚合恢复路线，具体状态仍按需读取真源，不能提高预算来挤占普通启动上下文。
- `overflow = true` 时至少保留受影响领域的聚合恢复路线。

条目级要求：

- 默认只投影 `near-trigger`、`pending-review`、`conflict`、`uncertain` 和 `stale`。
- 普通 `observing` 状态留在所属领域；只有无法由任何当前事件再次找到且确有高价值时，才可例外投影。
- `source_ref` 必须存在，且条目修订与真源一致。
- 短原因、进度和下一事件不得包含完整规则、隐私正文或外部命令。
- 高影响门禁必须显式暴露。

## 4. 非启动时间索引

`instance/maps/time-trigger-map.toml` 只在日期到达、时间项改变、重建或用户查看日程时读取：

```toml
schema_version = 1
map_id = "time-triggers"
instance_id = "template"
state = "current"
source_revision = 1
generated_at = ""
scheduled_count = 1
next_wakeup_at = "2027-02-10T00:00:00+08:00"

[[triggers]]
id = "governance.memory-technology-review"
kind = "governance"
status = "scheduled"
title = "记忆治理技术长期改进"
next_check_at = "2027-02-10T00:00:00+08:00"
effective_check_at = "2027-02-10T00:00:00+08:00"
domain = "assistant-maintenance"
route_id = "governance-memory-research"
source_ref = "instance/governance/memory-governance-card.md"
source_trigger_revision = 1
minimum_level = 3
confirmation = "user-starts-review"
```

- `scheduled_count` 必须等于实际条目数。
- `route_id` 必须能在 `domain` 对应的正式地图中解析，`source_ref` 必须存在；示例使用模板内真实稳定 ID，生成其他条目时不得照抄不属于目标卡的 ID。
- `effective_check_at` 为 `next_check_at` 与有效 `snoozed_until` 中较晚者；暂停、完成、拒绝或失效项不进入索引。
- `next_wakeup_at` 必须等于全部条目最早的 `effective_check_at`，并与唤醒胶囊一致。
- 索引只保存筛选和提醒所需元数据；用户选择具体项目后才读取 `source_ref`。
- 索引过大时按触发类别和领域分片；启动胶囊仍只保留一个聚合入口。

## 5. 正式资产上的可选时间字段

治理、延期任务或用户明确要求提醒的候选可以在 frontmatter 中使用：

```toml
schedule_state = "scheduled"
schedule_anchor_at = "2026-08-14T00:00:00+08:00"
last_completed_at = ""
next_due_at = "2027-02-10T00:00:00+08:00"
remind_at = ""
snoozed_until = ""
trigger_revision = 1
```

- 时间必须带时区偏移；未知不伪造。
- `schedule_state`：`uninitialized`、`scheduled`、`paused`、`due`、`completed` 或 `cancelled`。
- 周期卡用 `next_due_at`；一次性延期或候选提醒通常用 `remind_at`。
- `snoozed_until` 只改变有效检查时间，不改写原始到期时间。
- `trigger_revision` 只在触发元数据改变时增加。
- `expected_next_use` 不属于这些字段，不能单独进入时间索引。

## 6. 版本、模板与兼容

- 未知可选字段可以忽略；未知状态、门禁、时间语义或结构字段不得静默降级。
- Schema 1.1 保持 `schema_version = 1`，是在 1.0 基础上的兼容扩展；旧状态卡和旧空态地图仍可读取，重建时补齐聚合字段。
- `cross_session_signal_schema` 版本字符串应为 `1.1`。
- 可分发模板只能携带空控制记录、空唤醒胶囊、空时间索引和空白模板，不能包含任何用户的实际日期、个人信号或事件证据。
- 从任何工作副本生成可分发模板前，必须清除实例动态状态、把治理卡时间字段重置为 `uninitialized`，再从空态重建两个投影。

## 7. 本机事务恢复 envelope

`.assistant-local/runtime/cross-session-signals/` 保存实现层的临时恢复 envelope，不是新的正式真源格式，也不提高 `schema_version`。它必须被 Git、公开候选、安装包枚举、启动胶囊和迁移套件排除。每个操作至多对应一个物理目录，目录原子出现后至少闭合以下内容：

- 一个结构严格、大小有界的记录：`operationId`、实例与本机仓库绑定摘要、`createdAt`、`expiresAt`、`planDigest` 和完整 sealed plan；
- 按 sealed plan 顺序排列的 exact preimage descriptors 与 exact proposed-step descriptors；descriptor 只保存相对目标、私有 payload 文件名、SHA-256 和字节数；
- 每个 descriptor 对应一个物理、非链接、有大小上限的 payload 文件。payload 必须以其实际字节数和 SHA-256 同时闭合；缺失、额外文件、重复目标、未知步骤、绝对路径、链接或越界一律按 drift 失败关闭。

sealed plan 自身不得内联这些字节，必须包含八个唯一写目标（控制记录、候选正文、候选索引、学习信号、时间投影、启动信号投影、public 快照、dist 快照）、九个固定步骤、每步前后摘要、完整回滚摘要、每个步骤检查点的合并真源摘要，以及固定 TTL。public 与 dist 的 final digest 必须相同。控制记录既是第一步也是最后一步，final 只有在两份快照都已安装并回读后才能恢复 `clean`。

为重建快照而在仓库父目录创建的 sibling hardlink 投影不是恢复 envelope，也不是可读取的实例副本。目录名必须包含 signal runtime 自有前缀与当前仓库绑定摘要，并在复制任何真源前写入物理 owner marker（仓库绑定、目录名、PID、创建时间）。正常完成时按文件／目录预算自底向上删除，不使用会跟随链接的递归清理；进程强杀后的遗留只在后续 signal 事务构建或显式 signal cleanup 入口中有界扫描。只有 marker、父目录、仓库绑定和已死亡 PID 全部闭合，且整棵目录均为物理目录／文件、没有 symlink 或 reparse point 时才可删除。普通启动不扫描仓库父目录；伪造链接、未知 marker、其他仓库或非自有前缀一律保留且不得跟随。

恢复分类只允许：

- `preimage`：所有目标与合并真源均等于第 0 检查点；
- `final`：所有目标与合并真源均等于最后检查点；
- 合法 `prefix`：现场恰好等于某一个中间步骤检查点；
- `drift`：任何非前缀组合、未知摘要、实例身份变化、合并真源变化、bundle 损坏或无法闭合的原子替换现场。

TTL 只决定何时可以清除安全终态，不把合法前缀或 drift 解释成过期垃圾。`resume`、`rollback` 和第二次调用都必须跨进程幂等；恢复输出不得包含 payload、正文、base64 或绝对位置。
