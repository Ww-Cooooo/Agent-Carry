# 专业扩展清单 Schema 1.0

专业扩展是在某个 AI Carry 实例长期工作后形成的多文件专业工作区，例如行业处理工具、结构化数据流程或领域看板。它不是普通记忆、能力或 SOP，也不是公开模板预装的领域内容。

专业扩展是实例持续进化兼容协定的一种专门组件，但继续以本 Schema 为唯一所有者，不把同一工作区再复制进 `instance/components/registry.toml`。较小的独立实例模块、能力适配器和本机工具适配器使用 `core/schemas/instance-component.schema.md`；两种清单的路径不得重叠。

本 Schema 只解决四件事：这个工作区属于哪个实例；哪些文件是可携带真源；哪些文件可以重建或只属于当前设备；模板升级、换机和故障恢复时怎样保护它。没有专业工作区的实例不创建清单，也不增加普通启动读取。

扩展清单也使用 AI Carry 的可移植 TOML 子集：每个键值独占一行，字符串为 JSON 兼容双引号，数组保持单行，其他值只使用整数或布尔值，注释只能单独成行；不使用单引号、行尾注释、多行值、内联表、浮点数或 TOML 日期。这样任务族入口在不同宿主中可以由同一确定性加载器核对。旧扩展的其他合法 TOML 写法只在 Level 3 显式升级中规范化。

## 1. 位置与发现

- 每个扩展使用一个稳定 ID，并把清单放在 `workspace/<extension-id>/extension.toml`。
- `extension_id` 使用小写 ASCII 字母、数字、点和连字符，长度 3～64；`root` 必须精确等于 `workspace/<extension-id>`。
- 普通启动不得枚举 `workspace/`。只有实例领域地图已经命中该扩展、用户明确维护它，或正在迁移、升级、修复时，才读取这一份清单。
- 发现 `workspace/**` 但没有有效清单时，不能递归接管、删除、迁移或猜测所有权；把它列入冲突预览，等待 Level 3 判断。

## 2. 必需字段

- `schema_version = 1`
- `record_type = "ai-carry-professional-extension"`
- `extension_id`、`instance_id`、`title`、`summary`
- `extension_version`：该专业扩展自己的版本，不等于 AI Carry 产品版本。

AI Carry 2.0.0 新建扩展使用 `ai-carry-professional-extension`。从 Agent Carry 1.4.x 保留下来的 `agent-carry-professional-extension` 是唯一登记的旧别名：升级和按需任务族加载必须原样读取，不重写扩展正文；其他未知 `record_type` 仍拒绝。这个兼容只解决产品改名，不改变扩展所有权、脚本执行、私密引用或本机绑定边界。
- `status`：`active`、`review`、`disabled` 之一。
- `root`
- `load_policy = "on-demand-only"`

`instance_id` 必须与 `instance/manifest.toml` 一致。模板态不能预装一个伪造的已激活专业扩展。

## 3. 所有权分类

`[ownership]` 必须包含：

- `portable_paths`：扩展根内由用户拥有、需要随实例迁移的正式文件或相对目录；清单本身必须包含在内。
- `derived_paths`：可以从可携带真源重新生成的缓存、索引、构建输出或展示投影。
- `device_local_root`：固定为 `.assistant-local/extensions/<extension-id>` 或空字符串；这里保存当前设备状态，不进入公开仓库或迁移主体包。
- `private_collection_refs`：指向 `.assistant-private/catalog.toml` 中稳定集合 ID；只保存 ID，不保存绝对路径或隐私正文。
- `unclassified_policy = "review-before-upgrade-or-migration"`。

路径必须相对 `root`、使用 `/`、Unicode NFC，且不得包含空段、`.`、`..`、绝对路径、盘符、UNC、URL、控制字符、链接或重解析跳转。`portable_paths` 与 `derived_paths` 规范化后不能重叠，也不能使用宽泛 `**` 把整个未知工作区自动认领。

同设备模板升级默认逐字节保留整个已登记扩展根；只有清单明确列出的派生路径可以在可携带真源验证成功后重建。完整换机只把 `portable_paths` 放进助手主体包；私密集合继续走独立隐私分卷，设备本地根不迁移。未分类文件阻止“完整迁移”或“升级完成”结论，但不能被自动删除。

## 4. 入口与正式资产关系

`[entry]` 可以包含小型 `route_ids` 数组。每个 ID 必须在当前实例领域地图中存在，并指向扩展内一个真实入口或相关正式资产。存在 `asset_kind = "task-family"` 路线时，还必须用 `task_family_targets` 精确列出这些路线允许读取的扩展根相对 Markdown 入口；每项必须同时落在 `ownership.portable_paths` 的所有权范围内、没有链接或重解析跳转，并且文件不超过 32 KiB。只登记父目录、只登记路线 ID，或因为目标恰好位于扩展目录就默认可信，都不足以让正文进入模型。没有任务族入口时该数组保持空数组。清单不能替代正式记忆、能力、SOP 或经验的 frontmatter 和直接路线；专业工作区里的文档只有按资产生命周期获得授权、稳定 ID、正确 `kind` 和直接路线后，才能计入正式资产。

## 5. 升级与写入

扩展新增、更新、停用或删除也是正式实例持久变化：在本 Schema 的专门事务之外，同时命中 `core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md` 核对它没有越界拥有模板核心、其他组件或未登记设备本地路径。兼容核对不复制扩展清单，也不新增一次用户确认。

`[upgrade]` 必须包含：

- `template_policy = "preserve-extension-and-migrate-by-manifest"`
- `unknown_file_policy = "stop-and-preview"`
- `second_run = "no-change"`

`[writes]` 必须包含：

- `multi_file_policy = "transaction-required-when-two-or-more-durable-files-change"`
- `corrupt_input = "preserve-bytes-and-stop"`
- `temporary_name_policy = "short-sibling-name"`

多文件事务只记录相对路径、变更前摘要、候选摘要和阶段，不记录正文或秘密。先冻结写入集合并备份受影响文件，所有候选都能解析和验证后才共同提交；任一步失败时恢复全部受影响文件。文件不存在可以按 Schema 初始化，文件存在但无法解析不能走同一个默认空值分支。

在 Windows 上，临时文件名必须短且与目标同目录，不能在深层正式路径后继续拼接长随机描述。升级、采用或迁移还要按升级契约处理完整树身份与权限继承；不得通过自动提权绕过权限错误。

## 6. 可选本地网页写入

`[local_write]` 的 `mode` 只能是 `none` 或 `loopback-on-demand`。默认 `none`。选择 `loopback-on-demand` 只声明该扩展可能在用户明确启动时提供本地写入面，不等于获得授权；必须同时写 `security_protocol = "core/protocols/NETWORK_AGENT_SECURITY.md#本地-loopback-写入面"`，并遵守其中 Host、Origin、内容类型、会话令牌、事务、损坏保护和关闭条件。

AI Carry 正式看板仍是离线只读投影。专业扩展不得为了方便，把公开看板静默改造成写服务器或后台常驻服务。

## 7. 最小验收

1. 没有 `workspace/` 的空模板和普通实例行为、启动读取与迁移结果不变。
2. 登记扩展的可携带、派生、本机和私密边界互不重叠，所有入口与引用存在。
3. 不同安装根恢复后不残留旧绝对路径；私密集合按独立迁移契约恢复。
4. 多文件中断、损坏输入、深路径、未知文件和重复执行分别得到回滚、停止或零差异结果。
5. 升级后的看板快照只从合并后的实例真源重建，不把模板空态或扩展私密正文投影进去。
