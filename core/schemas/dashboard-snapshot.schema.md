# 看板快照 Schema 1.1

快照是可删除、可重建的只读派生物，不是真源。JavaScript 外壳为：

```js
window.AGENT_CARRY_SNAPSHOT = { /* JSON-compatible object */ };
```

现有离线看板使用以下稳定结构：

- `meta`：`schema_version`、`generated_at`、`product_version`、`state`、`freshness_seconds`、`source_digest`。
- `overview`：产品名、实例状态与方向、启动字符数和预算。
- `profile`：展示名、使命、方向 ID、语言，以及可选的 `guidance_mode`；不得包含原始隐私。`guidance_mode` 只允许 `unselected`、`step-by-step`、`balanced` 或 `direct`，用于显示当前交流方式，不表示用户能力等级。旧实例缺失时按 `balanced` 显示，模板缺失时按 `unselected` 显示。
- `model`：用户最后确认的等级、模型名、平台、确认时间和状态；未知就显示未知。
- `assets`：各资产类型计数。
- `memories`、`sops`、`capabilities`、`experiences`、`evolution`：只含展示元数据，不复制完整正文。每个可展示条目必须有非空 `id`、`title`、`summary`；固定流程（SOP）和能力还可带 `status`、`maturity`、`approval_state`、`reliability`、`triggers` 和有界 `evidence_summary`。Schema 1.1 的每条改进建议除 `status` 外，还必须投影非空 `source_summary`、`target_kind` 和 `next_step`：分别说明它从哪类真实任务／用户反馈／宿主观察中发现，当前建议沉淀为何种资产，以及用户或 Agent 下一步应怎样核对。`summary` 负责说明候选内容与未来用途，不能再用标题替代。
- `todo` 与 `governance`：普通待办和长期治理必须分开显示。每个待办必须有非空 `id`、`title`、`summary` 和 `status`，并可带 `visible`；`visible=false` 表示保留本机记录但不投影到看板。每个长期治理项目必须有非空 `id`、`title`、`summary`、`frequency`、`status`、`purpose`，以及至少一条 `steps`；可投影 `last_completed_at`、`next_due_at` 和 `schedule_state`，但看板不得据此执行任务。
- `deferred`：只显示有界摘要、等级、状态和提醒日期，不加载延期任务正文；到期判断仍由统一触发真源与时间索引负责。
- `skills`、`changes`、`advanced`：Skill 小地图状态、最近变化和入口文件摘要。
- `actions`：保留兼容字段，正式生成器应省略；前端必须忽略其中全部内容。全局动作来自正式动作登记表及同步构建的离线镜像，资产级动作由界面按稳定 ID 与正式规则生成，展示快照不能提供可执行请求。

生成规则：

- 只从正式清单、地图和资产元数据生成；快照不能反向修改真源。
- 正式资产变更、实例化、模型确认、升级或用户明确要求 Agent 重建时更新；不开后台持续扫描。这里的“重建”是 Agent 动作 `dashboard.refresh-snapshot`，不是网页的“重新读取本地快照”。
- 写临时文件、校验结构和来源摘要后再原子替换，避免页面读到半成品。
- 看板每 60 秒后台重新读取现有快照，并提供“重新读取本地快照”；倒计时实时显示 60→0。两者都只读取带缓存规避参数的小文件，不扫描来源、不生成文件。禁止整页重载：快照未变化不重绘，变化时只热更新数据，并保留当前栏目、选中项、滚动位置和动画实例。
- 快照缺失、按生成时间判断可能过期或解析失败时明确显示，不伪造最新状态。只读前端不能比较正式来源，因此年龄警告不是来源摘要不匹配的证明；摘要比对由正式写入流程或显式 Agent 重建动作负责。
- 快照生成器必须从当前正式资产提取展示字段，不能根据已知 ID 在前端硬编码卡片说明，也不能在字段缺失时回退到与当前实例无关的示例数据。
- 任一条目的标题或说明缺失时，生成阶段应报告具体资产并停止替换正式快照；界面层仍保留醒目的“说明缺失”兜底，避免空白卡片静默出现。
- 改进建议的 `source_summary` 必须由候选的 `source_refs`、代表性事件类别和有界证据计数生成正常人能读懂的一句话，例如“来自两次独立真实任务中的同一项用户纠正”。它不得复制稳定事件 ID、文件路径、对话原文、日志、隐私或外部攻击载荷；来源无法从正式元数据确定时写“现有记录尚未说明来源”，并在 `next_step` 中要求先补齐来源，不能猜测。
- `target_kind` 使用 `memory`、`capability`、`sop`、`experience`、`preference` 或 `unknown`；它只是当前建议去向，不代表已经生成正式资产。`next_step` 必须根据当前授权、风险、冲突与证据状态说明“确认、继续观察、再做真实验证、复核、合并或清理”中的实际下一步，不得把候选写成已经完成。

Schema 1.0 快照仍可读取；旧改进建议缺少上述三个字段时，界面显示明确的“来源待补充／去向待判断／处理前先核对”兜底。Agent 下一次因正式资产变化而重建快照时再按 1.1 补齐，不为了升级扫描全部候选正文。

Asset Schema 1.2 的 `maturity` 是正式真源；`reliability` 是为快照兼容保留的派生字段。生成器仍按以下优先顺序保留详细成熟度，不能为了简化界面而抹掉证据差异：

1. `status=review` 或存在未解决冲突 → “需要复核”；
2. `status=provisional` → “试用中”；
3. `maturity=unvalidated` → “待验证”；
4. `maturity=practiced` → “已实践”；
5. `maturity=reliable` → “已验证”；
6. `maturity=portable` → “跨宿主验证”。

普通用户界面只把这些字段归并为三种容易理解的状态：

- `review`、未解决冲突或兼容值“需要复核” → “需要复核”；
- `unvalidated`、`provisional`、兼容值“未评估”“试用中”“待验证”或未知成熟度 → “待验证”；
- `practiced`、`reliable`、`portable`，以及兼容值“已实践”“已验证”“跨宿主验证”“可使用” → “可使用”。

“可使用”只是看板上的简短说明，不表示这些正式成熟度相同。需要复核时优先于其他映射；详情、升级和治理仍以正式 `status`、`maturity`、冲突与证据为准。旧快照只有 `reliability` 时仍可显示；新生成器不能从 `approved_by_user` 推断可靠度。`evidence_summary` 只允许成功／失败／独立任务／宿主数量和最近验证时间等小型计数，不包含任务正文、路径、日志或隐私。
