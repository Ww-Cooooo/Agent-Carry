# 实例清单 Schema 1.0

必需字段：

- `schema_version`
- `instance_id`：模板为 `template`；实例化后使用新稳定 ID。
- `state`：`template` 或 `instance`。
- `created_from`、`created_at`
- `direction.type`：`unselected`、`general`、`domain`
- `direction.locked`：实例化后永久为 `true`
- `direction.domain_id`、`label`、`scope_statement`
- `direction.out_of_scope_policy`：固定为 `create-new-instance`
- `profile.user_preferences_ref`、`domain_map_ref`、`signal_control_ref`、`signal_map_ref`、`time_trigger_map_ref`、`host_registry_ref`
- `versions.product`、`extension_api`、`asset_schema`、`dashboard_snapshot_schema`、`cross_session_signal_schema`、`host_integration_schema`

可选的 `learning` 小节保存实例级学习政策：

- `policy`：`risk-tiered` 或 `manual-only`；缺失时为兼容旧实例按 `manual-only` 处理。
- `low_risk_promotion`：默认 `notify-and-reversible`，只允许符合资产生命周期全部条件的低风险内容进入试用。
- `medium_high`：固定为 `explicit-confirmation`。
- `direct_user_instruction`：固定为 `direct-authorization`，避免用户说“记住”后再次重复确认同一内容。

可选的 `privacy` 小节保存极小隐私处理模式；旧实例缺失时采用以下默认值：

- `current_execution_model`：默认 `allow-task-needed-private-context`。用户当前选择的宿主模型／API可以处理任务所需的最小隐私上下文，不逐项重复确认；这不表示宿主一定进行本地推理。
- `additional_sensitive_destination`：默认 `explicit-authorization`。网站、邮件、MCP／插件、额外 API、其他 Agent／账号／人员、遥测／日志、Git 与公开位置属于额外接收方。
- `git_storage`：固定 `exclude-private-and-secrets`；私密 Git 仓库也不自动放宽。
- `credentials`：固定 `host-secret-mechanism-only`。API 密钥、密码、令牌、Cookie、私钥、恢复码和登录态不能进入模型上下文、资产、Git 或隐私迁移包。

可选的 `profile.guidance_mode` 保存当前交流方式；旧实例缺失时按 `balanced` 处理：

- `unselected`：只用于尚未实例化的模板。
- `step-by-step`：第一次接触 Agent，使用普通话逐步解释，从职业、困难和目标找到第一项真实任务。
- `balanced`：已经用过一些 Agent 或编程工具，只补问会影响结果的关键信息。
- `direct`：经常使用 Agent 或熟悉编程，可直接讨论标准、资料、工具、SOP 和自动化边界。

`guidance_mode` 只控制说明密度、提问方式和协作节奏，不是用户能力评分，也不对应模型 Level 1／2／3。它可以在实例化后随时修改，不会改变实例方向、资产所有权或安全边界。

约束：

- `state=template` 时 `direction.type=unselected`、`locked=false`，且 `profile.guidance_mode` 为 `unselected` 或缺失。
- `state=instance` 时方向只能为 `general` 或 `domain`，且 `locked=true`；新实例的 `profile.guidance_mode` 必须为 `step-by-step`、`balanced` 或 `direct`。
- 已锁定实例不得改变 `direction.type` 或 `domain_id`。
- 修改 `profile.guidance_mode` 只调整交流方式，不得借此改变已锁定的 `direction.type`、`domain_id`、实例身份或既有资产。
- 通用实例不是未实例化模板；它是方向为 `general` 的正式实例。
- `signal_control_ref` 指向实例拥有的跨会话正式状态控制记录；`signal_map_ref` 与 `time_trigger_map_ref` 指向可重建投影。它们的 `instance_id` 必须与本清单一致。
- `host_registry_ref` 指向实例拥有的极小宿主接入索引。注册表不属于普通启动上下文，只在接入、恢复、变化、刷新或相关能力使用时按需读取；其中 `instance_id` 必须与本清单一致。
- 修改 `learning.policy` 本身需要用户明确决定。切换为 `manual-only` 默认只影响未来晋升，不静默撤销既有政策资产；用户若选择复核，先按状态元数据筛选。该小节只保存一个极小策略选择，不复制风险定义、成熟度阈值或生命周期正文；详细规则命中学习事件后才加载。
- 用户可以把 `privacy.current_execution_model` 改成更严格模式，但任何模式都不能放宽 `credentials` 和 `git_storage`。隐私小节只保存极小选择值；完整接收方、安全、导入导出和提示词攻击规则按事件加载，不扩写启动胶囊。
