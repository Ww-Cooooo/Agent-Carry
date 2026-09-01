# 启动胶囊 Schema 1.0

`instance/startup-capsule.toml` 是从经过严格校验的 `instance/manifest.toml` 生成的极小派生入口。它只帮助宿主在普通启动时确认实例身份、选择第一层路线并判断是否必须修复；不是第二份用户档案、资产索引、验证记录或授权真源。

## 1. 文件边界

- UTF-8、LF，最多 4096 字节；只允许根级标量，不允许 TOML section、数组表、自由扩展字段或注释正文。
- 必须恰好包含本 Schema 第 2 节的全部字段，字段顺序由正式生成器固定。未知、缺失、重复、类型不符或非规范序列化均视为失效。
- 来源清单最多 2560 字节，必须使用无 BOM 的 UTF-8 与 LF，并作为普通、无链接、读取期间未变化的文件在模型上下文外解析；不能先把原始清单文字交给模型再判断是否可信。公开 `.gitattributes` 必须让工作树、固定 Git 对象与 GitHub 自动归档保持相同的 LF 原始字节。
- 胶囊是可重建派生物。正式身份、方向、交流方式与学习政策仍以严格实例清单为真源。

## 2. 精确字段

| 字段 | 类型 | 约束与来源 |
| --- | --- | --- |
| `schema_version` | integer | 固定为 `1` |
| `capsule_id` | string | 固定为 `ai-carry-startup` |
| `source_manifest_digest` | string | `sha256:` 加 64 位小写十六进制；覆盖来源清单的原始完整字节 |
| `product_version` | string | 来自严格解析的 `core/manifest.toml` 版本；`core_id` 必须是当前 AI Carry 身份，且版本必须与实例清单 `versions.product` 一致 |
| `instance_id` | string | 来自实例清单；模板固定为 `template` |
| `state` | string | `template` 或 `instance` |
| `direction_type` | string | 来自方向真源；模板为 `unselected` |
| `direction_locked` | boolean | 来自方向真源；模板为 `false`，正式实例按实例清单保持锁定 |
| `domain_id` | string | 领域实例的稳定领域 ID；不适用时为空 |
| `guidance_mode` | string | `unselected`、`step-by-step`、`balanced` 或 `direct` |
| `learning_policy` | string | 模板投影为 `unselected`；实例只允许 `risk-tiered` 或 `manual-only` |
| `language` | string | 经实例清单校验的界面／交流语言，当前模板默认 `zh-CN` |
| `profile_ref` | string | 实例清单登记的可携带档案逻辑引用 |
| `domain_map_ref` | string | 实例清单登记的领域地图逻辑引用 |
| `signal_control_ref` | string | 实例清单登记的信号事务控制记录逻辑引用 |
| `signal_map_ref` | string | 实例清单登记的极小信号投影逻辑引用 |
| `root_map_ref` | string | 固定可信核心入口登记的根地图，当前为 `core/maps/root-map.toml` |
| `migration_required` | boolean | 严格解析器发现可保守读取但必须迁移的旧 Schema 状态时为 `true` |

所有 `*_ref` 都是仓库内逻辑引用，不得包含设备绝对路径、网址、`..`、秘密或用户正文。字段之间还必须满足 `instance-manifest.schema.md` 的模板／实例一致性约束；胶囊不能放宽来源清单。

Agent Carry 1.4.x 的 `agent-carry-startup` 只作为升级前的旧派生值识别，不能成为 2.0.0 的规范输出。目标产品真源与实例 manifest 有效时，升级事务或一次启动派生修复应把它重建为 `ai-carry-startup`；不得为保留旧胶囊而放宽当前严格结果，也不得把这一项可重建漂移升级成整个实例不可用。

## 3. 生成、更新与失败行为

1. 在模型上下文外稳定读取并严格解析实例清单和核心清单。
2. 先拒绝 BOM、CRLF 或其他非 LF 来源，再只投影本 Schema 白名单字段，计算来源清单精确摘要并生成规范字节；不能对开发工作树与分发归档分别计算两个不同摘要。
3. 在临时文件中解析、回读并核对完整字节、实例身份、版本、引用和摘要。
4. 创建实例和普通偏好修改先原子提交 manifest，再从它尽力重建胶囊；胶囊失败时保留新 manifest，启动查询使用严格 manifest 的有界白名单投影继续，并明确报告胶囊待修复。升级、迁移和正式发布在宣布完成前仍必须让胶囊与最终 manifest 闭合。
5. 同一来源再次生成必须字节一致。普通任务不得顺手改写胶囊。
6. 固定启动查询可在严格 manifest/core 已通过、且故障只属于胶囊缺失、CRLF、非 UTF-8 或规范字节陈旧时自动修复一次：使用既有原子同步器生成、替换、严格回读，再重试原启动。修复不得改变 manifest、用户资产或其他真源；失败必须恢复原胶囊或保持缺失现场，并停止继续尝试。

若上述一次派生修复成功，启动查询返回严格验证后的白名单投影和有界自然语言修复摘要，普通路由继续。若 manifest/core 有效而胶囊缺失、陈旧或一次修复未通过，查询返回同一份由 manifest 确定的有界启动投影并标记 `limited`：普通对话和只读任务继续，只有依赖胶囊持久闭包的动作待修复。只有 manifest/core 无效、身份或路径安全无法判断时，才返回 `startup-repair-required` 并暂停依赖该身份的持久操作；不得加载原始清单、验证索引或全部资产来猜。

## 4. 模型可见启动边界

模型可见启动上下文只由 `AGENTS.md`、`BOOTSTRAP.md`、根地图和可信查询器返回的固定 JSON 组成。查询器可在模型外检查信号控制与极小信号投影，但只返回登记的白名单摘要；下列内容不得因本 Schema 进入普通启动上下文：

- 原始 `assistant.toml` 或 `instance/manifest.toml`；
- 用户档案正文、正式资产正文、候选正文；
- `instance/validations/index.toml` 或验证记录；
- 原始信号卡、时间地图、全部领域地图；
- `workspace/`、`.assistant-private/`、`.assistant-local/` 或维护者私密层。

新增启动字段必须先升级本 Schema、严格运行时、预算校验和发布迁移契约；不能通过给胶囊追加“方便字段”绕过渐进上下文。
