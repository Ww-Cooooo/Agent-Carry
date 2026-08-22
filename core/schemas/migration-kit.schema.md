# 完整迁移套件 Schema 2.0

本 Schema 只在用户明确要求把整个 Agent Carry 迁移到另一台电脑、生成完整迁移套件或恢复该套件时读取。普通启动、同一台电脑换 Agent、GitHub 私有仓库脱敏备份和单独的日常隐私读取都不加载它。

它固定跨宿主可理解的文件结构、覆盖证明、分卷方式、校验顺序和失败条件，不绑定 Windows、macOS、Linux、某个 Agent、压缩工具或按钮位置。生成与恢复必须同时遵守 `core/protocols/PRIVACY_IMPORT_EXPORT_SOP.md` 与 `core/schemas/private-asset-catalog.schema.md`，不能临时发明另一套格式。

Schema 2.0 在 1.0 的“主体包与隐私包分开”基础上增加私密资产目录摘要、导出覆盖状态和多分卷／超大单文件分块。读取方必须继续接受合法的 1.0 五文件套件；不得要求旧套件为了兼容而重打包。

## 1. 套件根目录

一次迁移产生一个全新目录 `Agent-Carry-Migration-<kit-id>/`。小型实例仍正好包含五个文件：

1. `START-RESTORE.md`
2. `MIGRATION-MANIFEST.toml`
3. `CHECKSUMS.sha256`
4. `agent-carry-body-<kit-id>.zip`
5. `agent-carry-private-<kit-id>-part-0001-of-0001.zip`

当私密内容需要分卷时，第 5 项变成一个或多个连续编号的私密 ZIP；因此根目录文件总数固定为 `4 + private_part_count`。不得把日志、扫描报告、密码、临时解压目录或第三个混合包放进套件。顶层只允许普通文件，不允许目录、链接、快捷方式、重解析点或未在清单中声明的附件。

单独的 Schema 2.0 隐私导出不是残缺的完整迁移套件。它固定生成 `Agent-Carry-Private-Export-<export-id>/`，根目录只含 `PRIVATE-EXPORT-MANIFEST.toml`、`CHECKSUMS.sha256` 和一个或多个连续私密分卷，文件总数为 `2 + part_count`。顶层清单由 `core/templates/migration/PRIVATE-EXPORT-MANIFEST.template.toml` 生成，`record_type = "agent-carry-private-export"`；字段与完整迁移 `[private_package]` 相同，并额外记录 `export_id`、创建时间、源实例与产品／资产 Schema。`coverage_omissions` 在顶层使用 TOML 数组表，在各卷使用 JSON 数组，规范化后必须表达同一组缺项。私密导出的校验文件依次校验顶层清单和全部分卷，条目数为 `1 + part_count`，不校验自身。导入方据根清单和分卷内部 `export_scope = "private-only"` 区分它，不把它显示成完整迁移。

`kit-id` 使用不含真实姓名的随机稳定 ID。所有文件名必须是单一根目录文件名，不得含路径分隔符、绝对路径、`..` 或控制字符。

## 2. 顶层 `MIGRATION-MANIFEST.toml`

顶层字段：

- `schema_version = 2`
- `record_type = "agent-carry-complete-migration"`
- `kit_id`、`created_at`、`source_instance_id`、`product_version`、`asset_schema`
- `private_asset_catalog_schema = 1`
- `github_private_backup = false`
- `credentials_included = false`
- `included_categories`、`excluded_categories`

`[body_package]` 必须记录 `file`、`sha256`、固定归档根与内部清单路径、文件数、展开字节，以及两个 `false` 隐私／凭据标志。

`[private_package]` 汇总全部私密分卷：

- `schema_version = 2`
- `part_count`：大于等于 1；编号必须从 1 连续到本值。
- `entry_count`：逻辑恢复文件总数，不把块数当文件数。
- `uncompressed_bytes`：逻辑正文总字节。
- `catalog_revision`、`catalog_sha256`：导出时目录修订号与规范化便携目录快照摘要。这个快照保留目标设备重建目录所需的集合语义，但不含旧设备绑定 ID、绝对路径或时间易变字段。
- `coverage_status`：完整迁移只允许 `complete`。单独隐私导出可以是 `complete` 或用户明确接受的 `partial-approved`；后者必须同时满足第 5 节的缺项清单规则。
- `coverage_started_at`、`coverage_checked_at`：一致性窗口开始和全部分卷回读、源范围二次枚举与重新摘要通过后的带时区时间。
- `coverage_snapshot_sha256`：各分卷相同 `coverage_snapshot` 的规范 JSON SHA-256；快照包含一致性方法、路径集合摘要、逻辑文件数和总字节，不含绝对路径。
- `part_target_bytes`：本次用于规划普通分卷的目标上限；不是安全保证，单个存储条目仍需独立验证。
- `credentials_included = false`

随后按实际数量重复 `[[private_package.parts]]`，每项记录 `number`、`count`、`file`、`sha256`、固定内部清单路径、逻辑条目数、存储条目数和展开字节。

`[asset_counts]` 记录主体包内记忆、能力、SOP、经验、成长、待办、延期和治理数量。`[restore]` 固定恢复入口、校验文件、冲突策略、秘密重配和宿主接入时机。

完整迁移清单必须由 `core/templates/migration/MIGRATION-MANIFEST.template.toml` 生成并按需要重复分卷块；单独隐私导出使用上一节指定的独立模板。所有字符串占位符都必须替换；数字字段必须写 TOML 整数，不能保留带引号的数字。

## 3. 助手主体包

主体 ZIP 只允许：

- `body-package/manifest.json`
- `body-package/Agent Carry/<relative-path>`

内部 JSON 清单至少包含 `schema_version`、`package_type = "agent-carry-body"`、`kit_id`、`source_instance_id`、`product_version`、`archive_root`、`file_count`、`uncompressed_bytes`、`credentials_included = false` 和 `entries`。

每个 `entries` 项包含 `relative_path`、`size` 与 `sha256`。相对路径必须来自实例正式组件允许集合，不能是绝对路径、`..`、重复规范化路径、链接、Git 元数据、本地隐私正文、维护者材料、缓存、日志、回滚副本、构建依赖或无关工具。清单项与 ZIP 内普通正文一一对应；解压后的根目录必须仍能通过 `BOOTSTRAP.md`、`assistant.toml`、`instance/manifest.toml` 和模板正式地图识别。

## 4. 本地隐私分卷

每个私密 ZIP 只允许：

- `private-package/manifest.json`
- `private-package/assets/<collection-id>/<relative-path>`（完整存储的逻辑文件）
- `private-package/chunks/<object-id>/<chunk-number>.bin`（超大逻辑文件的分块）

每个分卷内部清单至少包含 `schema_version = 2`、`package_type = "agent-carry-private-part"`、`export_scope`、源实例 ID、当前分卷编号／总数、目录修订号／摘要、`catalog_snapshot`、`coverage_snapshot`、`coverage_status`、`coverage_omissions`、本卷逻辑出现数／本卷拥有数／存储条目数、展开字节、`credentials_included = false` 和 `entries`。身份字段由范围唯一决定：`complete-migration` 分卷必须有且只有 `kit_id`，并与顶层完整迁移清单一致；`private-only` 分卷必须有且只有 `export_id`，并与 `PRIVATE-EXPORT-MANIFEST.toml` 顶层 `export_id` 一致。二者不得同时出现，也不得用泛化 `transfer_id` 代替。全部分卷中的 `catalog_snapshot`、`coverage_snapshot`、`coverage_status` 和 `coverage_omissions` 必须逐字节规范化一致，避免目标设备只拿到文件却丢失集合名称、用途、恢复结构、导出一致性证据或已批准缺项。

- `export_scope = "complete-migration"` 时，`coverage_status` 固定为 `complete`，`coverage_omissions = []`，`kit_id` 与顶层一致，并且分卷必须由顶层完整迁移清单声明。
- `export_scope = "private-only"` 时，可以为 `complete` 或 `partial-approved`，`export_id` 与单独隐私导出顶层一致。`partial-approved` 只表示用户明确选择的单独隐私导出，不得被恢复方显示成“完整换机迁移”。
- `logical_entry_count` 是本卷 `entries` 的出现数；跨卷分块对象会在每个含其块的分卷出现，因此各卷此值之和可以大于顶层全局 `entry_count`。
- `owned_logical_entry_count` 只统计 `owner_part_number` 等于本卷编号的对象；全部分卷该值之和必须等于顶层全局 `entry_count`。
- `stored_entry_count` 等于本卷 ZIP 中除内部清单外的实际普通存储条目数；`uncompressed_bytes` 是这些本卷存储条目的字节和，不重复计算别卷的块。

`catalog_snapshot` 是迁移专用的便携逻辑目录，不是旧设备 `bindings.toml` 的副本。它包含：

- `schema_version = 1`、`record_type = "agent-carry-private-asset-catalog-export"`、源实例 ID 和目录修订号；
- 按 `id` 排序的集合；每项只保留 `id`、低敏 `title`／`purpose`、`source_kind_at_export`、`include_mode`、`include`／`exclude`、`future_files`、`restore_mode`、`restore_relative_root`、`risk_tier`、`approved_by_user`、`approval_ref` 和 `status`；
- `approval_ref` 只能是已验证存在、与本次批准范围一致的稳定事件或正式资产 ID，只允许 ASCII 字母、数字、点、冒号、下划线和连字符，最长 128 字符；不能把用户原话、路径、姓名或时间戳塞进该字段；
- 不包含 `binding_id`、`source_path`、设备名、用户名、盘符、旧电脑绝对路径、更新时间或审批正文。

目标设备根据该快照保留标题、用途、规则和恢复根，但把成功恢复的集合生成为 `source_kind = "managed-root"`，不复用 `source_kind_at_export` 作为当前绑定，也不伪造旧审批事件。若 `approved_by_user = true`，恢复方必须能在主体包或目标正式资产中解析 `approval_ref`；解析失败时仍可恢复已经校验的正文，但目录项必须降为 `approved_by_user = false`、`future_files = "ask-before-include"`、`status = "review"`，并向用户报告需要重新确认。用户以后明确选择新电脑上的外部目录时，再生成新的设备绑定和新审批记录。

每个逻辑 `entries` 项包含：

- `object_id`：本次套件内稳定唯一，不含真实姓名，并匹配 `^[a-z0-9][a-z0-9._-]{0,127}$`，因此可安全作为块目录名。
- `collection_id`、`logical_path`：必须能由私密资产目录或旧版稳定引用解释；集合 ID 使用目录 Schema 的安全字符集，逻辑路径使用第 5.1 节的便携规则。
- `restore_relative_path`：只能恢复到目标实例 `.assistant-private/assets/` 下，不含该固定前缀、绝对路径或 `..`；Schema 2.0 中必须逐字节等于该集合 `catalog_snapshot.restore_relative_root + "/" + logical_path` 的便携规范化结果，不能把正文放进另一个集合或改写相对结构。
- `asset_refs`：引用该正文的正式资产 ID／稳定私密引用；没有正式资产引用但经用户明确登记的集合，记录集合 ID。
- `size`、`sha256`：完整逻辑文件的字节数与 SHA-256。
- `conflict_policy = "preview-before-overwrite"`
- `storage_kind`：`whole-file` 或 `chunk-set`。
- `owner_part_number`：拥有该逻辑对象的唯一分卷；固定为承载完整文件或第一个块的分卷编号。
- `stored_items`：本分卷实际承载的存储条目。每项包含 `part_number`、`path`、`size`、`sha256` 和 `chunk_number`；`part_number` 必须等于当前分卷，完整文件的 `chunk_number = 0`。
- `chunk_count`：`whole-file` 固定为 `0`，`chunk-set` 为全局块数。
- `chunks`：`whole-file` 固定为空数组；`chunk-set` 必须携带全局完整块表，每项包含 `number`、`part_number`、`stored_path`、`size` 与 `sha256`。

`whole-file` 只在 `owner_part_number` 指定的一卷出现一次，并有且只有一个 `stored_items` 项；该存储项必须与逻辑文件大小、摘要一致。`chunk-set` 在每个实际承载其块的分卷各出现一次：核心字段、`owner_part_number`、`chunk_count` 与全局 `chunks` 表必须完全一致，只有 `stored_items` 随本卷变化。每个本地 `stored_items` 必须与全局 `chunks` 中同分卷、同路径的项一一对应，不能声明别卷的块；同一 `object_id` 不得在同一卷重复出现。块编号从 1 连续，`owner_part_number` 等于第 1 块所在卷，按块号拼接后的总大小与完整 SHA-256 必须等于逻辑项。恢复时先收齐并校验全部分卷和全局块表，再流式写入同目录临时文件，校验完整摘要后原子替换目标。

分卷规划规则：

1. 先按第 5 节的规范化 `collection_id + logical_path` 稳定排序，结果不能因文件系统枚举顺序改变。
2. 普通文件保持完整，放入当前仍能容纳它的分卷；不为追求精确大小拆小文件。
3. 单个文件超过 `part_target_bytes` 或目标介质的已知单文件限制时使用 `chunk-set`；块大小必须记录，不假定所有设备都支持同样限制。
4. 每个分卷都有独立清单和顶层摘要；任一分卷缺失或失败只允许报告不完整，不能恢复其余内容后声称完整成功。
5. 即使没有可迁移隐私正文，也生成一个只有内部清单的 `part-0001-of-0001.zip`，`entry_count = 0`；内部清单仍携带经过对账的空或仅含 0 项集合的 `catalog_snapshot`，覆盖状态仍需由对账得出。

绝对源路径和当前设备 `bindings.toml` 不进入任何分卷。目标设备默认把各集合恢复为 Agent Carry 管理副本；用户以后明确选择外部位置时再创建新设备绑定。

## 5. 覆盖证明

生成私密分卷前必须按 `private-asset-catalog.schema.md` 对目录集合、绑定、正式 `private_refs`、管理根实际普通文件和最终分卷清单做四方对账。

完整迁移的顶层和每个分卷内部只能写 `coverage_status = "complete"`。存在缺失绑定、悬空引用、未解释文件、秘密疑似项、链接、读取失败、摘要失败、未解决冲突或资源中断时必须停止完整套件生成。用户明确选择部分导出时，应改走 `export_scope = "private-only"` 的单独隐私导出，写 `partial-approved` 和 `coverage_omissions`；不能把它包装成完整换机迁移。

`coverage_omissions` 在 `complete` 时必须为空。`partial-approved` 时必须在每个分卷携带同一份按 `omission_id` 排序的脱敏清单；每项至少包含稳定 `omission_id`、`collection_id`、`scope_kind`（`collection`、`relative-subtree` 或 `relative-file`）、可选的规范化 `relative_scope`、`reason_code`、`approved_by_user = true` 和可验证的稳定 `approval_ref`。`reason_code` 只允许 `user-selected-subset`、`source-temporarily-unavailable`、`resource-limit-deferred`、`unsupported-file-type`、`unresolved-conflict` 或 `secret-credential-excluded`。它不能包含绝对路径、秘密原值或大段文件列表。恢复方必须把这些缺项明确报告并保持相应目录项为 `review`；不得把缺项当作已恢复或自动从目标电脑补猜。

`coverage_snapshot` 必须符合 `private-asset-catalog.schema.md` 第 6.1 节。`coverage_snapshot_sha256`、路径集合摘要、逻辑文件数与总字节必须同时在顶层汇总和每卷内部一致；源目录在打包窗口发生变化时不得用旧快照或旧哈希继续生成。

### 5.1 跨系统相对路径与匹配规则

目录枚举和恢复必须使用同一套可实现的便携规则，不能依赖当前操作系统默认的大小写或 Glob 行为：

1. 先把路径按文件系统真实条目拆成段，再把分隔符统一为 `/`；每段规范化为 Unicode NFC。拒绝空段、`.`、`..`、NUL、控制字符、绝对路径、盘符、UNC、URL 和任何链接／重解析跳转。
2. 为保证能恢复到 Windows、macOS 与 Linux，每段还不得含 `< > : \" \\ | ? *`，不得以空格或点结尾，且去掉扩展名后不得等于 `CON`、`PRN`、`AUX`、`NUL`、`COM1`–`COM9` 或 `LPT1`–`LPT9`（ASCII 大小写不敏感）。不兼容项进入预览，不能静默改名。
3. `logical_path`、`restore_relative_path`、`include`、`exclude` 和块路径都使用上述 `/` 形式。重复键为“NFC 后逐段把 ASCII `A-Z` 映射为 `a-z`”的结果；同一导出范围内重复键冲突即失败关闭，以免在大小写不敏感文件系统覆盖。
4. Glob 只支持三种符号：`*` 匹配单段内任意数量字符，`?` 匹配单段内一个字符，独立路径段 `**` 匹配零个或多个完整路径段。反斜杠转义、字符组、花括号和操作系统扩展语法不受支持；模式本身也必须是相对、NFC、无 `.`／`..` 的 `/` 路径。
5. 匹配统一区分大小写，先判断 `include`，再让 `exclude` 覆盖。`single-file` 必须恰好一个不含通配符的 `include`；`recursive` 至少一个 `include`。`future_files = "include-when-matching-policy"` 只能复用同一组规则，不得扩大集合根。

`catalog_sha256` 的输入是每个分卷内部清单所携带的同一份 `catalog_snapshot`：使用 UTF-8、无 BOM、LF 换行的规范 JSON；对象键按本节固定顺序，集合按 `id` 排序，数组保持目录规则顺序。摘要、规范化快照与全部分卷必须一致。生成方只在脱敏报告中说明修订号、集合数、摘要和规范化方法；恢复方直接从通过校验的快照重建逻辑目录，不要求拥有旧设备绝对路径。

## 6. `CHECKSUMS.sha256`

每行格式固定为 `<64 位小写 SHA-256><两个空格><套件根目录单一文件名>`。条目顺序固定为 `START-RESTORE.md`、`MIGRATION-MANIFEST.toml`、主体 ZIP，再按 `part_number` 升序列出所有私密 ZIP。它不校验自身，避免自引用摘要。条目数必须等于 `3 + private_part_count`；目录、绝对路径、额外文件和重复文件名不允许出现。顶层清单、校验文件与实际文件摘要必须三方一致。

## 7. 恢复前检查与失败关闭

任何解压或覆盖前必须完成：

1. 套件根目录只含顶层允许文件，私密分卷数量和连续编号与清单一致；
2. 所有占位符已替换，实例 ID、套件 ID、版本和计数内部一致；
3. 顶层校验、每个 ZIP 内部清单、实际普通条目和完整逻辑文件摘要一致；
4. 拒绝绝对路径、`..`、重复规范化路径、链接／重解析点、加密未知条目、要求递归展开的迁移容器、异常压缩比和超出本次说明上限的展开量；由逻辑条目明确声明且摘要通过的普通 ZIP、DOCX、XLSX 等用户资料只作为不透明单文件恢复，不递归执行或解压；
5. 不执行包内脚本、宏、安装器或命令式文本；
6. 目标实例不匹配、方向锁冲突、目录已有不同正文或任何块缺失时，先生成集中预览，不静默覆盖或猜测合并。

主体包和私密分卷分别失败关闭。恢复完成后重新核对实例身份、资产计数、目录集合、`private_refs`、文件摘要、派生索引和看板入口；秘密凭据在目标设备通过宿主秘密机制重新配置。

## 8. 1.0 兼容读取

Schema 1.0 的合法套件仍按以下完整旧契约读取；不能用“原有规则”代替可执行字段，也不能要求旧套件重打包：

1. 根目录正好包含 `START-RESTORE.md`、`MIGRATION-MANIFEST.toml`、`CHECKSUMS.sha256`、`agent-carry-body-<kit-id>.zip` 和 `agent-carry-private-<kit-id>.zip` 五个普通文件。额外条目、目录、链接和占位符均失败关闭。
2. 顶层清单必须有 `schema_version = 1`、`record_type = "agent-carry-complete-migration"`、`kit_id`、`created_at`、`source_instance_id`、`product_version`、`asset_schema`、`github_private_backup`、`credentials_included = false`、`included_categories`、`excluded_categories` 与 `[asset_counts]`。`[body_package]` 必须有 `file`、`sha256`、`archive_root = "body-package/Agent Carry"`、`manifest_path = "body-package/manifest.json"`、`file_count`、`uncompressed_bytes`、`private_content_included = false`、`credentials_included = false`；`[private_package]` 必须有单一 `file`、`sha256`、`manifest_path = "private-package/manifest.json"`、`entry_count`、`uncompressed_bytes`、`credentials_included = false`。`[restore]` 必须逐项为 `entry = "START-RESTORE.md"`、`checksum_file = "CHECKSUMS.sha256"`、`target_existing_policy = "preview-before-overwrite"`、`secrets = "reconfigure-on-target-with-host-secret-mechanism"` 和 `host_attachment = "after-restore-rebuild-and-validation"`；不得依赖仓库外或已经被 2.0 替换的旧模板解释这些字段。
3. 主体 ZIP 只允许 `body-package/manifest.json` 与 `body-package/Agent Carry/<relative-path>`。内部清单必须有 `schema_version = 1`、`package_type = "agent-carry-body-migration"`、`package_id`、套件／实例／产品／资产 Schema／创建时间、固定 `archive_root`、资产计数、两个 `false` 安全标志和 `entries`；每项为 `relative_path`、`size`、`sha256`，与实际普通文件一一对应。
4. 隐私 ZIP 只允许 `private-package/manifest.json` 与 `private-package/assets/<relative-path>`。内部清单必须有 `schema_version = 1`、`package_type = "agent-carry-private-migration"`、`package_id`、套件／实例／产品／资产 Schema／创建时间、`credentials_included = false` 和 `entries`；每项为 `relative_path`、位于 `.assistant-private/assets/` 下的 `restore_path`、稳定 `asset_ref`、`size`、`sha256`、`conflict_policy = "preview-before-overwrite"`，与实际普通文件一一对应。空包只含清单和空数组。
5. `CHECKSUMS.sha256` 正好四行，依次校验入口、顶层清单、主体 ZIP、隐私 ZIP；每行仍是 64 位小写摘要、两个空格和单一文件名。顶层两个 ZIP 摘要、校验表和实际文件必须三方一致；校验文件不校验自身。

通过以上身份、路径、计数、展开量、链接、秘密与摘要检查后，把旧隐私条目视为 `legacy-private-ref`，只为实际命中的条目渐进建立目录项；不伪造 2.0 的历史覆盖证明，而是报告 `coverage_status = "legacy-manifest-only"`。缺少 2.0 的目录、分卷、便携审批引用或覆盖字段本身不是拒绝合法 1.0 套件的理由。
