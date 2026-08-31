# 实例清单 Schema 1.0

实例清单是普通启动必读的极小控制文件，不是用户档案或资产容器。当前母版固定硬上限为 2560 UTF-8 字节，并由 `assistant.toml` 的 `bootstrap.maximum_instance_manifest_bytes` 声明；超过上限时普通启动失败关闭，只读取有界文件头说明“实例清单需要修复”，不得把超限正文送入模型，也不得通过提高启动总预算掩盖膨胀。

必需字段：

- `schema_version`
- `instance_id`：模板为 `template`；实例化后使用新稳定 ID。
- `state`：`template` 或 `instance`。
- `created_from`、`created_at`
- `direction.type`：`unselected`、`general`、`domain`
- `direction.locked`：实例化后永久为 `true`
- `direction.domain_id`、`label`、`scope_statement`
- `direction.out_of_scope_policy`：固定为 `create-new-instance`
- `profile.user_preferences_ref`、`domain_map_ref`、`signal_control_ref`、`signal_map_ref`、`time_trigger_map_ref`、`host_registry_ref`。空模板可以暂时让 `user_preferences_ref` 指向目录说明；正式实例必须改为真实用户档案（默认 `instance/profile/approved-profile.md`），不得继续引用升级时会被替换的 `instance/profile/README.md`。
- `validation.evidence_index_ref`：固定为 `instance/validations/index.toml`。索引是实例拥有的低敏结果证据真源，不进入普通启动；模板和新实例即使记录数为 0，也必须存在并与清单使用同一 `instance_id`。
- `versions.product`、`extension_api`、`asset_schema`、`dashboard_snapshot_schema`、`cross_session_signal_schema`、`host_integration_schema`。1.2.0 起还记录 `private_asset_catalog_schema` 与 `migration_kit_schema`；1.2.1 起可记录 `extension_manifest_schema`；支持有界进化候选索引的版本记录 `evolution_candidate_index_schema = "1.0"`；使用正式资产确认门注册表的版本记录 `asset_confirmation_gate_schema = "1.0"`；使用低敏结果证据闭包的版本记录 `result_validation_evidence_schema = "1.0"`；使用严格模型外启动胶囊的版本记录 `startup_capsule_schema = "1.0"`。旧实例缺失这些 1.3 字段时只表示需要一次显式元数据迁移，不得猜测未知更高版本；只在实例化、学习事件或正式升级中初始化并回读，不为补字段扫描正文，也不能把原始 manifest 展示文字直接加入普通启动上下文。

可选的 `learning` 小节保存实例级学习政策：

- `policy`：`risk-tiered` 或 `manual-only`；缺失时为兼容旧实例按 `manual-only` 处理。`risk-tiered` 只决定已获准观察候选的验证与复核优先级，不授权创建正式资产。
- `low_risk_promotion`：固定为 `explicit-confirmation-after-notice`。低风险候选达到证据门后，宿主先用普通语言说明内容、范围、证据和撤销方式；只有用户明确选择采用或限定试用后，才可建立正式资产。
- `medium_high`：固定为 `explicit-confirmation`。
- `direct_user_instruction`：为兼容既有 1.3 清单仍固定为 `direct-authorization`；这里的“直接授权”指用户看过精确内容预览并选择“留下”后的授权，不表示模型或普通 JSON 可以替用户签发，也不表示当前通用母版支持免预览直写。

可选的 `privacy` 小节保存极小隐私处理模式；旧实例缺失时采用以下默认值：

- `current_execution_model`：默认 `allow-task-needed-private-context`。用户当前选择的宿主模型／API可以处理任务所需的最小隐私上下文，不逐项重复确认；这不表示宿主一定进行本地推理。
- `additional_sensitive_destination`：默认 `explicit-authorization`。网站、邮件、MCP／插件、额外 API、其他 Agent／账号／人员、遥测／日志、Git 与公开位置属于额外接收方。
- `git_storage`：固定 `exclude-private-and-secrets`；私密 Git 仓库也不自动放宽。
- `credentials`：固定 `host-secret-mechanism-only`。API 密钥、密码、令牌、Cookie、私钥、恢复码和登录态不能进入模型上下文、资产、Git 或隐私迁移包。
- `private_asset_catalog`：默认 `create-on-first-relevant-use`。空模板和没有私密资产需求的实例不预先创建目录。
- `private_asset_catalog_load`：固定 `on-demand-only`。只有登记／取消登记资料、命中 `private_refs`、隐私导入导出或完整换机迁移时加载相关目录项。
- `complete_export_scope`：固定 `registered-and-referenced`。完整结论只覆盖 AI Carry 管理、正式引用或用户明确登记的资料，不声称扫描整台电脑。

可选的 `profile.guidance_mode` 保存当前交流方式；旧实例缺失时按 `balanced` 处理：

- `unselected`：只用于尚未实例化的模板。
- `step-by-step`：第一次接触 Agent，使用用户当前交流语言逐步解释，从职业、困难和目标找到第一项真实任务。
- `balanced`：已经用过一些 Agent 或编程工具，只补问会影响结果的关键信息。
- `direct`：经常使用 Agent 或熟悉编程，可直接讨论标准、资料、工具、SOP 和自动化边界。

`guidance_mode` 只控制说明密度、提问方式和协作节奏，不是用户能力评分，也不对应模型 Level 1／2／3。它可以在实例化后随时修改，不会改变实例方向、资产所有权或安全边界。三种模式都必须服从 `assistant.toml` 的极小交流基线和 `core/protocols/USER_GUIDANCE.md`：需要用户作出实质选择时，背景、完整选项、后果、能够成立的推荐和“不确定”入口不能因 `balanced` 或 `direct` 而省略。

约束：

- 清单只使用单行 TOML 字符串、整数和布尔值，不使用多行字符串、内联表、数组或可执行扩展。每个键在所属小节内唯一；所有字符串必须为 Unicode NFC，拒绝 NUL、C0/C1 控制字符以及 `U+202A`～`U+202E`、`U+2066`～`U+2069` 双向控制字符。单个字符串最多 512 个 Unicode 字符；`instance_id` 最多 160 个、`direction.label` 最多 80 个、`direction.scope_statement` 最多 240 个、任何 `*_ref` 最多 240 个。读取旧实例和未来扩展时，有界、安全的未知标量字段或小节必须原样保留，但不得进入启动胶囊、快照、权限、路径、身份或状态投影；当前版本的写入器仍只生成已登记字段。未知字段不安全、超限或带非标量结构时只暂停相关迁移，不能把它静默解释为授权，也不能因此删除用户数据。
- 所有 `*_ref` 必须是以 `instance/` 开始的规范仓库相对 POSIX 路径：不得含反斜杠、冒号、URL、查询、片段、空段、`.` 或 `..`。解析后必须仍在当前 AI Carry 根目录，目标必须是普通文件，任一路径段为符号链接、目录联接或其他重解析点时失败关闭。不能从相邻目录、标题或旧绝对路径猜测替代目标。

- `state=template` 时 `direction.type=unselected`、`locked=false`，且 `profile.guidance_mode` 为 `unselected` 或缺失。
- `state=instance` 时方向只能为 `general` 或 `domain`，且 `locked=true`；新实例的 `profile.guidance_mode` 必须为 `step-by-step`、`balanced` 或 `direct`。
- 已锁定实例不得改变 `direction.type` 或 `domain_id`。
- 修改 `profile.guidance_mode` 只调整交流方式，不得借此改变已锁定的 `direction.type`、`domain_id`、实例身份或既有资产。
- 通用实例不是未实例化模板；它是方向为 `general` 的正式实例。
- `signal_control_ref` 指向实例拥有的跨会话正式状态控制记录；`signal_map_ref` 与 `time_trigger_map_ref` 指向可重建投影。它们的 `instance_id` 必须与本清单一致。
- `host_registry_ref` 指向实例拥有的极小宿主接入索引。注册表不属于普通启动上下文，只在接入、恢复、变化、刷新或相关能力使用时按需读取；其中 `instance_id` 必须与本清单一致。
- `validation.evidence_index_ref` 只能指向固定结果验证索引。首次实例化必须把该索引与 manifest、启动胶囊和双快照放入同一可恢复事务：只把索引身份初始化为新实例，保持 `state=empty`、0 修订、空时间、正式预算、0 记录且没有 `[[validations]]`。尚未执行的首项任务不能成为验证记录；任一失败恢复整组前像。
- 修改 `learning.policy` 本身需要用户明确决定。切换为 `manual-only` 只改变候选验证、复核和提问节奏，不静默授权、撤销或改写正式资产。1.2 旧实例中的 `policy-authorized` 资产必须按 1.3 升级规则定向复核，不能因为当前政策值被自动视为 `explicit`。该小节只保存一个极小策略选择，不复制风险定义、成熟度阈值或生命周期正文；详细规则命中学习事件后才加载。
- 用户可以把 `privacy.current_execution_model` 改成更严格模式，但任何模式都不能放宽 `credentials` 和 `git_storage`。隐私小节只保存极小选择值；完整接收方、安全、导入导出和提示词攻击规则按事件加载，不扩写启动胶囊。
- 私密资产目录和当前设备绑定都位于受 Git 排除的 `.assistant-private/`。模板升级保留现有目录、绑定和正文；目标设备不会原样复用旧绝对路径。
- 专业工作区是可选实例层。没有 `workspace/` 的实例不创建扩展字段或清单；存在 `workspace/**` 时，每个受 AI Carry 管理的扩展必须使用 `workspace/<extension-id>/extension.toml`，并遵守 `core/schemas/extension-manifest.schema.md`。普通启动不得枚举工作区；未登记工作区在升级或迁移时进入冲突预览，不能被模板递归接管。
