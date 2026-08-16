# 统一触发与跨会话信号 Schema 1.1

本 Schema 定义事务控制记录、动态状态卡、极小唤醒胶囊、非启动时间索引，以及正式资产上的可选触发字段。全部使用 TOML 或 Markdown TOML frontmatter；不要求数据库、后台服务或特定宿主 API。

## 1. 控制记录

当前入口由 `assistant.toml` 的 `[signals]` 声明：

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

- `trigger.mode`：`domain-rule`、`count`、`time`、`metric`、`conflict`、`explicit-user` 或未来兼容值。
- `independent_event_count`：只统计不同独立任务事件。
- `threshold_value = 0`：由目标规则决定，不代表自动触发。
- `next_check_at`：只有确有独立提醒需求时填写；普通生命周期日期不能冒充提醒。
- `event_source + event_id`：共同标识一次事件；重试或重复回传必须复用。
- `relation`：`supporting`、`contradicting`、`neutral` 或 `superseding`。

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
budget_bytes = 8192
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
progress = "3 个独立任务事件"
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
- `budget_bytes` 从配置读取，实际文件不得静默超限。
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
