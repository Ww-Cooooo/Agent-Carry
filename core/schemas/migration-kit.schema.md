# 完整迁移套件 Schema 1.0

本 Schema 只在用户明确要求把整个 Agent Carry 迁移到另一台电脑、生成完整迁移套件或恢复该套件时读取。普通启动、同一台电脑换 Agent、GitHub 私密备份和单独隐私导入导出都不加载它。

它固定的是跨宿主都能理解的文件结构、字段、校验顺序和失败条件，不绑定 Windows、macOS、Linux、某个 Agent、压缩工具或按钮位置。生成与恢复都必须同时遵守 `core/protocols/PRIVACY_IMPORT_EXPORT_SOP.md` 和本 Schema；不能由当前模型临时发明另一套格式。

## 1. 套件根目录

一次完整迁移产生一个新的本地文件夹。标准套件根目录正好包含五个文件：

1. `START-RESTORE.md`
2. `MIGRATION-MANIFEST.toml`
3. `CHECKSUMS.sha256`
4. `agent-carry-body-<kit-id>.zip`
5. `agent-carry-private-<kit-id>.zip`

`<kit-id>` 使用不含真实姓名的随机稳定 ID。不得缺少隐私包；没有合格隐私正文时，隐私包仍存在并在内部清单记录 `entries = []`。意外出现的额外文件不自动信任、执行或并入恢复，只报告并隔离判断。

## 2. 顶层 `MIGRATION-MANIFEST.toml`

生成时必须以 `core/templates/migration/MIGRATION-MANIFEST.template.toml` 为唯一字段模板，替换全部 `{{...}}` 占位符并把数量字段写成 TOML 整数。完成文件不得残留 `<...>` 或 `{{...}}` 占位符。

必需顶层字段：

- `schema_version = 1`
- `record_type = "agent-carry-complete-migration"`
- `kit_id`、`created_at`、`source_instance_id`
- `product_version`、`asset_schema`
- `github_private_backup`：本地套件默认为 `false`；它只记录本动作是否另行完成过 GitHub 私密备份，不授权联网。
- `credentials_included = false`

`body_package` 与 `private_package` 小节都必须包含：

- `file`：套件根目录中的单一文件名，不能含目录分隔符；
- `sha256`：对应完整 ZIP 的 64 位小写 SHA-256；
- `manifest_path`：固定为相应包内的 `body-package/manifest.json` 或 `private-package/manifest.json`；
- `file_count`／`entry_count` 与 `uncompressed_bytes`：非负整数；
- 主体包的 `archive_root` 固定为 `body-package/Agent Carry`；
- 两个包的 `credentials_included` 都必须为 `false`；主体包的 `private_content_included` 也必须为 `false`。

主体包的 `file_count` 等于其内部清单 `entries` 的数量，`uncompressed_bytes` 等于这些正文项的 `size` 总和；都不把内部清单文件本身计入。隐私包的 `entry_count` 和 `uncompressed_bytes` 使用同一口径。生成后不得把模板中的数字占位符继续保留为字符串。

`asset_counts` 记录主体包内正式实例的实际数量：`memory`、`capabilities`、`sops`、`experiences`、`evolution`、`todo`、`deferred`、`governance`。每个值都是排除目录说明和空占位后的非负整数，必须与主体包内部清单和解压后的正式资产一致。

`included_categories` 与 `excluded_categories` 是类别说明，不代替逐文件允许集合。`restore` 小节固定恢复入口、校验文件、冲突策略、秘密重配和“恢复验收后才接入目标 Agent”的顺序。

## 3. 助手主体包

主体 ZIP 只允许两个逻辑区域：

- `body-package/manifest.json`
- `body-package/Agent Carry/<relative-path>`

内部清单是 UTF-8 JSON，必需字段：

- `schema_version = 1`
- `package_type = "agent-carry-body-migration"`
- `package_id`、`kit_id`、`source_instance_id`
- `product_version`、`asset_schema`、`created_at`
- `archive_root = "body-package/Agent Carry"`
- `asset_counts`
- `credentials_included = false`
- `private_content_included = false`
- `entries`

每个 `entries` 项包含 `relative_path`、`size` 和 `sha256`。清单项必须与 ZIP 中 `body-package/Agent Carry/` 下的实际普通文件一一对应，不允许缺失、多余、重复、绝对路径、`..`、链接或套件外目标。恢复者先读取内部清单、核对完整集合和摘要，再只写入这些允许路径；不能用“压缩包里有这个文件”代替允许判断。

主体包允许包含恢复当前实例所需的模板核心、实例身份、锁定方向与当前交流方式、Git 安全的正式资产、稳定地图、离线看板和已随产品分发的许可证资料。它必须排除 `.git/`、`.assistant-private/`、`.assistant-local/`、`maintainer-private/`、宿主工具目录与锁文件、秘密凭据、缓存、日志、报告、临时验收材料、回滚副本、构建依赖和无关文件。

## 4. 本地隐私包

隐私 ZIP 只允许两个逻辑区域：

- `private-package/manifest.json`
- `private-package/assets/<relative-path>`

内部清单是 UTF-8 JSON，必需字段：

- `schema_version = 1`
- `package_type = "agent-carry-private-migration"`
- `package_id`、`kit_id`、`source_instance_id`
- `product_version`、`asset_schema`、`created_at`
- `credentials_included = false`
- `entries`

每个 `entries` 项包含 `relative_path`、`restore_path`、`asset_ref`、`size`、`sha256` 和 `conflict_policy = "preview-before-overwrite"`。`asset_ref` 必须由主体包内正式资产的稳定 `private_refs` 解释；`restore_path` 只能位于目标实例 `.assistant-private/assets/`。清单项和 ZIP 正文必须一一对应。空包只含内部清单，`entries = []`。

隐私包不是秘密包。API 密钥、密码、令牌、Cookie、私钥、恢复码和登录态仍然禁止进入；它们在目标环境通过宿主秘密机制重新配置。

## 5. `CHECKSUMS.sha256`

本文件使用常见 SHA-256 文本格式，每行严格为：

```text
<64位小写十六进制摘要><两个空格><套件根目录单一文件名>
```

标准文件正好校验四项，顺序为：`START-RESTORE.md`、`MIGRATION-MANIFEST.toml`、主体 ZIP、隐私 ZIP。`CHECKSUMS.sha256` 不校验自身，避免自引用摘要；目录、绝对路径和额外文件名都不允许出现在校验表中。顶层清单里的两个 ZIP 摘要必须与本文件和实际文件三方一致。

## 6. 恢复前检查与失败关闭

恢复者在写入目标目录前必须完成：

1. 五个根文件和全部占位符检查；
2. 四项顶层 SHA-256 校验；
3. 两个 ZIP 的文件数、展开总量、单文件大小、重复名、绝对路径、`..`、链接、加密条目和异常嵌套检查；
4. 两份内部清单与 ZIP 实际条目的一一对应检查；
5. 套件 ID、源实例 ID、产品／Schema 版本、方向锁、交流方式、资产数量和稳定隐私引用的交叉检查；
6. 秘密凭据与越界内容的本地确定性检查，只报告类别和位置，不回显疑似秘密原值。

资源上限由当前宿主根据设备能力给出有界值；不得无限解压、递归处理嵌套包或无进展重试。任何身份、摘要、集合、路径、版本或秘密检查失败，都停止受影响包并报告预期值、实际值和可安全重试方式，不能猜测、静默补文件或带病继续。

成功解压并导入隐私后，从正式真源重建可删除的索引、极小唤醒状态和看板快照；核对 `asset_counts`、实例 ID、方向、交流方式和本地看板，再按宿主接入协议连接用户选择的目标 Agent。迁移套件、源实例和回滚材料在用户验收前都不自动删除。
