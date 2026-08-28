# 数据契约

这些文件描述 Agent Carry 的稳定结构，不要求安装专用 Schema 工具。Agent 在创建或升级资产时按字段说明检查；本地索引和看板只能读取这些真源并生成派生数据。

- `instance-manifest.schema.md`：实例身份、可调整的交流方式与永久方向锁。
- `map-entry.schema.md`：小地图路由条目。
- `asset-frontmatter.schema.md`：记忆、能力、SOP、经验、延期任务、治理和候选资产，以及授权依据、风险、证据成熟度和宿主执行经验引用。
- `asset-confirmation-gates.schema.md`：正式资产确认门的已知 ID、语义、执行边界和旧实例保守兼容规则。
- `result-validation-evidence-index.schema.md`：正式能力、SOP 与宿主执行经验的低敏验证证据索引；只在成熟度核对、升级、维护或快照重建时按需读取，不能凭资产自报计数伪造闭包。
- `startup-capsule.schema.md`：由严格实例清单在模型上下文外生成的极小启动派生物；规定精确字段、摘要绑定、事务重建、失败关闭和普通启动可见边界。
- `cross-session-signal.schema.md`：统一触发控制记录、动态状态卡、极小唤醒胶囊、非启动时间索引和可选时间字段。
- `evolution-candidate-index.schema.md`：只在学习信号命中后读取的候选元数据索引；支持跨任务同类匹配，不进入普通启动，也不复制候选正文。
- `host-integration.schema.md`：跨 Agent 接入胶囊、回执、宿主档案、任务胶囊和回传包。
- `dashboard-action.schema.md`：看板复制给 Agent 的完整动作请求。
- `dashboard-snapshot.schema.md`：只读看板快照。
- `skill-export-index.schema.md`：只在实例真正生成共享 Skill 后创建的本地导出索引；共享包不携带来源资产 ID，空模板不预创建。
- `release-manifest.schema.md`：模板升级发布清单。
- `private-asset-catalog.schema.md`：用户明确登记要随助手携带的本地资料、当前设备路径绑定、渐进加载和导出前无静默遗漏对账。
- `migration-kit.schema.md`：完整换机迁移套件 2.0；主体包与一个或多个私密分卷分离，支持超大文件分块、覆盖证明、摘要和 1.0 旧套件兼容恢复。
- `extension-manifest.schema.md`：可选专业工作区的稳定所有权、可携带／派生／本机／私密边界，以及升级、事务和按需加载要求；普通实例不创建。
- `instance-component.schema.md`：独立实例组件的小注册表、所有权、接口、设备本地绑定和升级动作；原生资产与专业扩展继续复用各自已有的正式所有者，普通启动不读取组件注册表。
- `../templates/migration/PRIVATE-EXPORT-MANIFEST.template.toml`：Schema 2.0 单独隐私导出的顶层清单模板；与完整迁移套件分开命名，避免部分导出冒充完整换机。
- `../templates/extension/blank-extension-manifest.toml`：只在真实专业工作区形成后使用的空扩展清单；不是预装领域模板。
- `../templates/component/blank-instance-component.toml`：只在真实独立组件形成后使用的空组件清单；公开模板的 `instance/components/registry.toml` 保持零组件。

Schema 发生不兼容变化时必须提升对应 Schema 版本，并在发布清单中提供迁移说明。

运行时、界面与实例投影不是同一组件。资产检索、跨会话学习事务、启动胶囊和快照生成器位于 `dashboard/scripts/`，由组件地图中的独立运行时组件拥有；`dashboard-ui` 只拥有用户界面与构建后的离线页面；两份 `snapshot.js` 由独立的实例快照投影组件拥有。实例中的 `startup-capsule.toml` 是可重建派生物，`instance/validations/index.toml` 是实例拥有的正式低敏证据索引，两者都不属于普通启动时可随意扩展的界面数据。
