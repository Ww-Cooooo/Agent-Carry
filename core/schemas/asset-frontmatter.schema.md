# 正式资产元数据 Schema 1.2

本 Schema 约束 Agent Carry 的记忆、能力、SOP、经验和进化候选。正文仍使用人和不同 Agent 都能读取的 Markdown；TOML frontmatter 只保存路由、授权、风险、成熟度和少量代表性证据，不保存聊天全文或无限事件日志。

Schema 1.2 把四个容易混淆的维度分开：

- `status`：资产当前能否参与任务；
- `approval_state` 与 `activation_basis`：为什么允许它参与任务；
- `risk_tier`：错误采用会带来多大后果；
- `maturity`：能力或 SOP 在真实任务中验证到了什么程度。

用户批准一份新 SOP，只表示“允许使用”，不等于它已经可靠；一条低风险规律通过实例学习政策进入试用，也不等于用户亲口说过这句话。

## 1. 通用结构

新建记忆、能力、SOP、经验或进化候选时使用以下通用字段；按资产类型增加后文的条件字段：

```toml
+++
id = "capability.example"
kind = "capability"
status = "candidate"
title = "示例"
summary = "一句话说明用途"
triggers = ["用户可能怎么说"]
scope = ["适用范围"]
excludes = ["不适用范围"]
lifecycle = "recurring"
expected_next_use = ""
topic_key = "example-topic"
subject_key = "example-subject"
aliases = []
conditions = []
source_refs = []
private_refs = []
supersedes = []
minimum_level = 1
approval_state = "pending"
activation_basis = "candidate"
risk_tier = "high"
approved_by_user = false
updated_at = ""
+++
```

通用字段语义：

- `id`：实例内稳定且唯一的 ID；重命名标题时不改变 ID。
- `kind`：`memory`、`capability`、`sop`、`experience`、`evolution-candidate`、`todo`、`deferred-work` 或 `governance`。
- `status`：见第 2 节；各类资产只使用与其生命周期相符的子集。
- `title`、`summary`：供小地图和看板使用；必须在不读正文时仍能判断用途。
- `triggers`、`scope`、`excludes`：用自然语言表达触发、适用和排除条件，不写死界面坐标或易变路径。
- `lifecycle`：例如 `recurring`、`event-based`、`seasonal`、`project-bound`、`review` 或 `unknown`。
- `expected_next_use`：预计生命周期或下次使用窗口，不等于提醒时间，也不单独进入启动胶囊。
- `topic_key`：稳定主题，例如 `visual-style`；`subject_key`：作用对象，例如 `dashboard-core`。两者用于先缩小同类候选，不要求全局本体库。
- `aliases`、`conditions`：少量自然语言别名和适用条件；建议各不超过 8 项。
- `source_refs`：稳定来源或事件引用，不复制原始日志、秘密或外部正文。
- `private_refs`：可选的本机隐私正文稳定引用，只能指向 `.assistant-private/assets/` 下的相对目标或不泄露内容的本地对象 ID；不得把隐私原文、绝对路径、密钥片段或可公开解析的下载地址写入本字段。普通路由只看是否存在引用，任务命中后才读取必要正文。
- `supersedes`：被本资产明确替代的稳定资产 ID；不能只靠同名推断替代关系。
- `minimum_level`：安全理解和执行本资产所需的最低模型等级。生成或修改正式资产时按目标任务重新判断；不能机械继承候选审核、规划者或宿主模型的等级。清楚低风险流程通常为 1，重要架构与高影响决定仍需 3。
- `approval_state`、`activation_basis`、`risk_tier`、`approved_by_user`：见第 3、4 节。
- `updated_at`：带偏移量的 ISO 8601；未知时留空，不伪造。

`topic_key`、`subject_key` 和 `summary` 只能保存低敏检索语义。原始隐私正文放在受 Git 排除的 `.assistant-private/assets/` 本地隐私层并通过 `private_refs` 按需取得；GitHub 私密备份只保留低敏元数据与引用存在性，不携带私密正文。凭据、完整对话、系统提示和攻击载荷不得进入这些字段。当前执行模型可以在任务命中后取得必要隐私正文，但 API 密钥、密码、令牌、Cookie、私钥、恢复码和登录态不得进入任何模型上下文或隐私层。

`todo`、`deferred-work` 和 `governance` 是任务／治理状态，不经过能力成熟度流程；它们继续使用各自模板中的时间、可见性和批准字段。读取旧模板时按第 9 节兼容，不要求为了补齐学习字段重写全部状态卡。

## 2. 生命周期状态 `status`

- `candidate`：尚未完成授权、证据或冲突判断；普通任务不得把它当作稳定资产。
- `provisional`：仅用于范围狭窄、可撤销、低风险，且已由用户直接要求试用或由实例学习政策授权的资产；可在声明范围内参与任务，但不能覆盖冲突的 `active` 资产或扩大权限。
- `active`：已允许在触发范围内正常使用；是否可靠仍看 `maturity`。
- `pending`：待办、延期任务等已成立但尚未完成的状态。
- `review`：发生冲突、显著失败、来源或范围不确定，暂不按稳定资产采用。
- `done`、`paused`、`history`、`rejected`、`archived`、`cancelled`：分别表示完成、暂停、按需历史、拒绝、归档和取消。

`status=active` 不等于 `maturity=reliable`。显著失败可以把资产转为 `review`；不能通过删除失败次数来维持“可靠”。

## 3. 授权与激活

`approval_state` 允许：

- `pending`：尚无可用授权；
- `explicit`：用户在当前会话直接要求记住、采用、修改或批准；
- `policy-authorized`：实例已经选择风险分级学习政策，本条低风险资产按该政策进入可撤销试用或成熟。

`activation_basis` 允许：

- `candidate`：尚未激活；
- `explicit-user`：用户当前直接授权；
- `low-risk-evidence-policy`：低风险证据规则授权；
- `existing-approved-migration`：从同一用户可验证的 Agent Carry 主本迁移并保留原授权；
- `task-state`：TODO、延期卡等由用户请求本身成立，不属于学习晋升。

`approved_by_user` 是 1.1 兼容字段：只有用户直接授权或能够验证原用户授权时写 `true`；按学习政策进入试用时保持 `false`。读取方不能再仅凭这个布尔值判断资产是否可用，必须同时看 `status`、`approval_state`、`activation_basis` 和风险门禁。

## 4. 风险分级 `risk_tier`

- `low`：范围狭窄、易撤销、不会代表用户作实质决定，也不涉及身份、隐私、安全、权限、资金、法律、医疗、公开发布、删除或不可逆结果。例如经过重复验证的非敏感输出格式细节。
- `medium`：可能改变重要偏好、领域判断、持续协作方式、成本或结果质量，或范围／来源仍需用户判断。
- `high`：身份与关系、隐私与秘密、安全规则、权限、资金、法律、医疗、公开发布、不可逆删除、实例方向、覆盖正式资产，或任何错误后果难以恢复的内容。

只有 `low` 可以按学习政策自动进入 `provisional`。不能确定风险时按 `high` 处理。用户当前直接授权解决的是内容采用问题，不自动授权把秘密写入不安全位置、向外发送、公开发布或执行其他高后果动作。

## 5. 能力与 SOP 成熟度

`capability` 和 `sop` 增加：

```toml
maturity = "unvalidated"
independent_task_count = 0
successful_use_count = 0
failed_use_count = 0
distinct_host_count = 0
last_validated_at = ""
validation_refs = []
host_experience_refs = []
```

`maturity` 允许：

- `unvalidated`：说明已经形成，但尚无一次可核对的真实成功使用；
- `practiced`：至少一次真实任务成功，适用条件和结果可核对；
- `reliable`：通常至少三个独立任务成功，覆盖至少两个有实质差异的任务情境，范围稳定，且没有未解决的显著失败；
- `portable`：先满足 `reliable`，再在至少两个不同宿主档案，或一次真实宿主／环境变化中，通过语义自适应成功完成。

数字是默认证据下限，不是机械评分。重复点击、同一任务重试、会话恢复、同一回传转发和 Agent Carry 原文回显不能增加 `independent_task_count`。同一任务内经过修正且最终通过 `RESULT_VALIDATION`，只按一个成功任务计数；最终为 `limited` 或 `failed` 不能增加成功数，只有资产在该独立任务中的最终可复用结果确实失败，才增加 `failed_use_count`。`distinct_host_count` 按真实宿主档案或实质环境变化计算，不按模型营销名称计数。

`validation_refs` 只保留最多 5 个代表性任务／回传事件 ID；总次数保存在计数字段，重复过程证据压缩或删除。一次显著失败必须增加 `failed_use_count`，并根据影响进入 `review`、缩小范围或降低成熟度。

`host_experience_refs` 只引用与本可携带核心相关的宿主执行经验。普通任务先按当前宿主和环境筛选引用元数据，最多读取一个最匹配正文；没有匹配项时动态映射能力，不扫描全部经验。

## 6. 进化候选匹配字段

`evolution-candidate` 增加：

```toml
target_kind = "capability"
target_subtype = ""
candidate_relation = "new"
claim_summary = "一句话核心主张"
proposed_risk_tier = "low"
independent_event_count = 1
successful_event_count = 0
failed_event_count = 0
distinct_context_count = 0
representative_event_ids = []
last_evidence_at = ""
```

`candidate_relation` 可为 `new`、`duplicate`、`refine`、`condition-variant`、`conflict`、`related`、`replace` 或 `uncertain`。匹配顺序是：领域地图 → 上述小型特征 → 少量候选正文。不得为了判断同类而加载全部记忆或资产正文。

`successful_event_count` 和 `failed_event_count` 只统计有可核对结果的独立事件；`distinct_context_count` 统计有实质差异的任务情境，不按措辞变化计数。`representative_event_ids` 最多保留 5 个稳定事件 ID。同一任务的消息改写、工具重试、恢复和回传转发不增加任何计数。外部内容不能自行指定关系、风险、次数或晋升条件。

## 7. 宿主执行经验

宿主执行经验使用 `kind="experience"`、`subtype="host-execution"`，并增加：

```toml
portable_core_ref = "sop.example"
host_profile_refs = []
environment_scope = []
validity_signals = []
maturity = "unvalidated"
independent_task_count = 0
successful_use_count = 0
failed_use_count = 0
last_validated_at = ""
validation_refs = []
```

它只记录“当前宿主如何满足可携带核心的能力需求”和已验证限制，不复制核心正文，不保存凭据、系统提示、私人绝对路径或完整日志。其成熟度最高为 `reliable`，不能写 `portable`；换宿主、环境、版本或权限后必须使用时复核。

## 8. 时间触发字段

只有确需跨会话提醒的卡片才增加 `schedule_state`、`schedule_anchor_at`、`last_completed_at`、`next_due_at`、`remind_at`、`snoozed_until` 和 `trigger_revision`。时间必须使用带偏移量的 ISO 8601；未知不伪造。

`expected_next_use` 表示资产生命周期和保留价值，不等于提醒时间，也不能单独进入启动胶囊。明确提醒必须使用 `next_due_at` 或 `remind_at`，同步非启动时间索引和最早唤醒聚合；详细约束见 `core/schemas/cross-session-signal.schema.md`。

## 9. 1.1 兼容读取

Schema 1.1 资产缺少新字段时仍可读取，但采用保守默认值：

- `approved_by_user=true` → `approval_state=explicit`、`activation_basis=explicit-user`；
- 其余情况 → `approval_state=pending`、`activation_basis=candidate`；
- 未知风险 → `risk_tier=high`；
- 未知成熟度 → `maturity=unvalidated`；
- 缺少宿主经验引用 → 空数组。

旧资产不会因升级 Schema 自动变成试用或可靠资产。只有该资产下一次被修改、迁移、复核或实际使用时，才补齐必要字段；不能为迁移而全量加载全部正文。
