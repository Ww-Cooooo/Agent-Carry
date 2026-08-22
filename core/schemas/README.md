# 数据契约

这些文件描述 Agent Carry 的稳定结构，不要求安装专用 Schema 工具。Agent 在创建或升级资产时按字段说明检查；本地索引和看板只能读取这些真源并生成派生数据。

- `instance-manifest.schema.md`：实例身份、可调整的交流方式与永久方向锁。
- `map-entry.schema.md`：小地图路由条目。
- `asset-frontmatter.schema.md`：记忆、能力、SOP、经验、延期任务、治理和候选资产，以及授权依据、风险、证据成熟度和宿主执行经验引用。
- `cross-session-signal.schema.md`：统一触发控制记录、动态状态卡、极小唤醒胶囊、非启动时间索引和可选时间字段。
- `host-integration.schema.md`：跨 Agent 接入胶囊、回执、宿主档案、任务胶囊和回传包。
- `dashboard-action.schema.md`：看板复制给 Agent 的完整动作请求。
- `dashboard-snapshot.schema.md`：只读看板快照。
- `release-manifest.schema.md`：模板升级发布清单。
- `private-asset-catalog.schema.md`：用户明确登记要随助手携带的本地资料、当前设备路径绑定、渐进加载和导出前无静默遗漏对账。
- `migration-kit.schema.md`：完整换机迁移套件 2.0；主体包与一个或多个私密分卷分离，支持超大文件分块、覆盖证明、摘要和 1.0 旧套件兼容恢复。
- `../templates/migration/PRIVATE-EXPORT-MANIFEST.template.toml`：Schema 2.0 单独隐私导出的顶层清单模板；与完整迁移套件分开命名，避免部分导出冒充完整换机。

Schema 发生不兼容变化时必须提升对应 Schema 版本，并在发布清单中提供迁移说明。
