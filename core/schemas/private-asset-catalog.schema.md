# 本地私密资产目录 Schema 1.0

本 Schema 只在以下情况按需读取：用户要求登记／取消登记要随 Agent Carry 携带的本地资料，正式资产新增或修改 `private_refs`，导出／导入本地隐私包，或准备完整换机迁移。普通启动、普通对话、只读任务和 GitHub 私有仓库脱敏备份都不加载目录正文。

它解决的问题是：实例化后的助手可能逐渐产生课程、视频、账务附件、客户材料等不同领域内容。Agent Carry 必须知道哪些资料属于用户明确要求随助手携带的范围，并在导出前证明这些范围没有被静默遗漏；它不能靠扫描整台电脑猜测，也不能把一个目录里碰巧存在的所有文件都当成用户资产。

## 1. 两份本地真源

实际实例在首次需要时创建以下两个受 Git 排除的本地文件；空模板不预先创建：

- `.assistant-private/catalog.toml`：跨设备可携带的逻辑目录。只保存稳定 ID、低敏标题、用途、纳入规则、恢复策略和引用关系，不保存绝对路径或秘密原值。
- `.assistant-private/bindings.toml`：当前设备绑定。只保存稳定集合 ID 到当前设备实际文件／目录的绝对路径映射；它是机器相关状态，不进入 Git，也不原样迁移到新设备。

文件正文可能包含个人绝对路径，因此两份文件都只能按需读取。普通地图最多记录“存在目录、集合数量、是否有待处理覆盖问题、最后一次对账时间和目录摘要”，不得复制路径、文件名列表或隐私正文。

## 2. `catalog.toml`

```toml
schema_version = 1
record_type = "agent-carry-private-asset-catalog"
instance_id = "instance.example"
updated_at = "2026-08-20T00:00:00+08:00"
catalog_revision = 1

[[collections]]
id = "private.collection.course-media"
title = "课程视频与讲义"
purpose = "换电脑后继续制作课程"
source_kind = "external-binding"
binding_id = "binding.course-media.current-device"
include_mode = "recursive"
include = ["**/*"]
exclude = ["**/.cache/**", "**/*.tmp"]
future_files = "include-when-matching-policy"
restore_mode = "managed-copy"
restore_relative_root = "collections/private.collection.course-media"
risk_tier = "high"
approved_by_user = true
approval_ref = "event.example"
status = "active"
```

顶层字段：

- `schema_version`：当前为整数 `1`。
- `record_type`：固定为 `agent-carry-private-asset-catalog`。
- `instance_id`：必须与当前实例一致。
- `updated_at`：实际更新目录的带时区 ISO 8601 时间；未知不伪造。
- `catalog_revision`：每次有意义的目录变更递增，用于导出覆盖快照，不是聊天轮次。

每个 `collections` 项：

- `id`：实例内稳定且唯一，不含真实姓名；重命名标题不改变 ID。它必须匹配 `^[a-z0-9][a-z0-9._-]{0,127}$`，因此可以安全作为跨系统清单键和 ZIP 路径段；`binding_id` 使用同一字符集。不得把标题、盘符或绝对路径编码进 ID。
- `title`、`purpose`：让用户能判断为什么要携带；只用低敏文字。
- `source_kind`：`managed-root`、`external-binding` 或 `legacy-private-ref`。
- `binding_id`：`external-binding` 必填；其他类型留空或省略。它只能指向 `bindings.toml` 的稳定 ID。
- `include_mode`：`single-file` 或 `recursive`。
- `include`、`exclude`：相对于绑定根或管理根的有界匹配规则；不能使用绝对路径、父目录跳转或跟随链接的规则。路径分隔、Unicode、大小写、保留名、冲突键和 Glob 方言统一使用 `core/schemas/migration-kit.schema.md` 第 5.1 节，不调用宿主或操作系统自带的另一套隐式 Glob 语义。
- `future_files`：`include-when-matching-policy` 或 `ask-before-include`。前者只在用户已经明确批准这个集合的持续纳入规则后使用；它不扩大到集合根之外。
- `restore_mode`：当前为 `managed-copy`。目标设备默认恢复到 `.assistant-private/assets/<restore_relative_root>/`，再由用户决定是否重新绑定到外部目录。
- `restore_relative_root`：只能是 `.assistant-private/assets/` 下的相对目标，不得为绝对路径或包含 `..`。
- `risk_tier`：私密集合固定按 `high` 处理。
- `approved_by_user`、`approval_ref`：登记外部集合或持续纳入未来文件必须能追溯到用户明确决定；由正式资产 `private_refs` 首次形成的 `legacy-private-ref` 可记录对应资产 ID。`approval_ref` 只能是可解析的稳定事件或资产 ID，匹配 `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`，不能包含用户原话、姓名、路径或秘密。完整迁移会携带这个低敏引用而不携带审批正文；目标无法解析时必须把自动纳入规则降级为待确认，不能只凭布尔值继承授权。
- `status`：`active`、`review`、`missing` 或 `retired`。`review`／`missing` 阻止完整覆盖结论；`retired` 不导出，但保留最小撤销依据直到用户确认清理。

## 3. `bindings.toml`

```toml
schema_version = 1
record_type = "agent-carry-private-path-bindings"
instance_id = "instance.example"
updated_at = "2026-08-20T00:00:00+08:00"

[[bindings]]
id = "binding.course-media.current-device"
collection_id = "private.collection.course-media"
source_path = "<current-device-absolute-path>"
path_kind = "directory"
follow_links = false
device_hint = "current-device"
status = "active"
```

- `source_path` 只存在本地绑定文件，不进入正式资产、普通地图、看板快照、Git、顶层迁移清单或模型不需要的上下文。
- `path_kind` 为 `file` 或 `directory`，必须与实际对象一致。
- `follow_links` 固定为 `false`。符号链接、目录联接、快捷方式、重解析点和挂载跳转默认不跟随；用户确实要纳入目标时，应登记真实目标为另一个集合。
- 一个 `active` 集合在当前设备最多有一个 `active` 绑定。缺失、类型变化或指向实例外的新位置时转为 `review`，不猜测替换。
- 绑定文件不原样恢复到新设备。恢复后根据目标实际位置生成新绑定，或保留为 Agent Carry 管理副本。

## 4. `private_refs` 的稳定写法

正式资产可以使用以下两种兼容引用：

- 目录对象：`private://<collection-id>/<relative-path>`；
- 旧版相对目标：`.assistant-private/assets/<relative-path>`。

新写入优先使用 `private://`。旧版相对目标继续可读；当该资产下一次被使用、修改或导出时，Agent 只为命中的引用建立一个 `legacy-private-ref` 目录项，不全库重写。`private_refs` 不得含绝对路径、秘密片段或可公开下载地址。

## 5. 何时登记

以下事件命中本 Schema，但只读取与当前事件有关的最小条目：

1. 用户明确说某个文件／文件夹要“跟着助手走”“换电脑也要带上”或要求登记／取消登记；
2. 正式资产准备新增、改变或删除 `private_refs`；
3. 当前任务生成了长期依赖的大型本地资料，用户明确表示它属于这个助手的持续工作资产；
4. 导出、导入或完整迁移前进行覆盖对账。

普通任务输出不会自动成为 Agent Carry 私密资产。Agent 发现一个可能长期依赖的外部资料根时，只能用普通语言问一次是否纳入；用户未确认就不登记，也不反复提示。

### 5.1 Agent 已经创建或操作过的资料

当前接入的 Agent 在任务中创建、下载、转换、移动、重命名、整理或交付了文件时，实际路径属于本次操作已经知道的事实。Agent 必须复用这个事实，不能在任务结束后让用户重新提供路径。用户管理的是“这些资料以后是否要随助手携带”的意图，不是内部目录和绑定字段。

任务产出包含视频、音频、图片、课件、数据集、工程文件、账务附件或其他明显占用空间的内容时，交付结果后按 `core/protocols/USER_GUIDANCE.md` 做一次有针对性的去向判断：区分以后继续编辑所需的素材／工程文件、最终成品、可重新生成的大型导出物和临时文件，并给出 2～4 个带空间与可恢复后果的完整选项以及“不确定，请帮我判断”。不能只问“哪些文件要带走”或“要不要保存”。

- 用户已经明确要求长期使用或换电脑时带走：该自然语言是登记授权。Agent 用已知位置生成普通语言预览；除非范围包含其他人的大量资料、秘密目录、链接跳转或存在实质冲突，不重复询问路径或同一授权。
- 用户选择只带一部分：把包含、排除和未来文件规则转换为有界集合；用户只确认语义结果，不填写 Glob、Schema 或配置表。
- 用户选择临时使用：不创建目录项，不删除原文件，也不反复提示。
- 用户不确定：一次只问一个会改变判断的问题，例如成品能否稳定重建、以后是否继续编辑或迁移介质容量；随后给出有依据的建议。

只有 Agent 未参与创建／移动、当前宿主无法观察位置、用户曾在外部手动移动，或资料在接入 Agent Carry 前已经存在时，才需要用户帮助定位。优先使用当前宿主已有的文件选择或定位能力；没有时再用普通语言逐步帮助，不要求用户打开终端。

登记完成后必须报告逻辑集合、已知来源、包含／排除范围、未来文件规则和实际写入结果。无法持久化时明确报告“尚未登记”并给出可交给有写入能力宿主的最小请求，不能只在聊天中口头承诺。

## 6. 导出前覆盖对账

导出不能只遍历目录文件，也不能只相信 `private_refs`。它必须在本地对以下四组集合做确定性核对：

1. 所有 `active` 目录集合及其当前绑定；
2. 正式资产中命中的 `private_refs`；
3. `.assistant-private/assets/` 下由目录或旧引用解释的实际普通文件；
4. 本次准备写入私密包各分卷清单的条目。

对账至少识别：缺失绑定、绑定根不存在、文件类型变化、摘要读取失败、目录内未被策略解释的普通文件、引用悬空、同一路径被不同对象冲突声明、链接／重解析点、秘密凭据疑似项、超过当前资源上限和导出后清单缺项。

只有同时满足以下条件才能写 `coverage_status = "complete"`：

- 每个 `active` 集合都成功展开为一个有界文件集合；
- 每个有效 `private_ref` 都能解析到一个实际条目或一个明确的 0 字节合法正文；
- 每个准备纳入的普通文件都进入恰好一个分卷清单并通过大小与 SHA-256 回读；
- 每个未纳入项都有用户已批准的持久排除策略；
- 没有秘密凭据、未知链接、缺失源、未解决冲突或资源中断。

`complete` 只证明“已登记和已引用的范围完整”，不声称扫描过整台电脑。若存在阻塞项，使用 `blocked`；若用户明确选择只导出一部分，使用 `partial-approved` 并列出遗漏范围，不能称为完整迁移。

### 6.1 一致性时点

长时间打包视频或其他大文件时，`complete` 不能只证明“某一轮枚举看起来完整”。生成方必须建立一个有界一致性窗口：

1. 开始时记录目录修订号，按便携路径规则枚举允许范围，并生成排序后的路径集合摘要；
2. 每个文件读取前后都核对类型、大小和可用的文件身份／修改标记，流式计算逻辑 SHA-256；读取期间变化立即使本轮失败；
3. 全部分卷落盘并回读后，再次枚举同一范围并重新计算每个逻辑文件 SHA-256；最终路径集合、文件数、总字节和摘要必须与包内逻辑清单完全一致；
4. 在全部检查完成后才记录 `coverage_checked_at`。目录或文件在窗口中新增、删除、重命名或改写，目录修订变化、绑定变化、无法稳定读取或第二次摘要不同，都不能写 `complete`。只允许有界重试，不无限追赶持续变化的目录。

分卷清单必须携带同一份 `coverage_snapshot`：`started_at`、`checked_at`、`consistency_method = "post-package-reenumerate-and-rehash"`、`path_set_sha256`、`logical_entry_count`、`logical_bytes`。这些字段只描述本次已登记范围，不包含绝对路径。宿主能提供可信只读快照时可以用等价的 `consistency_method`，但必须在清单中明确名称，并仍核对最终包条目；不能默默降低为只看修改时间。

文件枚举、摘要、复制和压缩应由本地工具流式完成。模型只接收集合 ID、相对路径的必要摘要、数量、字节、状态和脱敏问题类别，不把大文件正文或完整文件清单塞进上下文。

## 7. 删除与变更

- 取消登记不等于删除原文件。默认只把集合标为 `retired` 并说明它将不再进入以后导出；删除正文需要单独明确授权。
- 文件移动或绑定改变时，先对比旧集合 ID、相对路径和摘要，生成预览后更新绑定；不能用同名猜测身份。
- 已被正式资产引用的集合不能静默退休。先指出受影响资产，并让用户选择改引用、保留集合或接受悬空风险。
- 目录文件数量、总字节或异常展开量超过宿主当次说明的上限时停止并给出可恢复的分批方案，不无限重试。

## 8. 兼容性

- 没有 `catalog.toml` 的旧实例仍可使用。只有命中登记、引用或迁移事件时，才从现有 `.assistant-private/assets/` 和当前相关 `private_refs` 渐进建立目录。
- Migration Kit Schema 1.0 的单一隐私 ZIP 继续可导入；导入后按旧清单建立 `legacy-private-ref` 条目。
- Schema 2.0 的每个私密分卷携带一份脱敏便携目录快照；它保留可验证的稳定 `approval_ref`，但不带审批正文或旧设备绑定。目标无法解析批准依据时按 `review` 恢复，不静默继承持续纳入权限。
- 升级模板不得覆盖实例已有目录、绑定或私密正文。新模板只提供 Schema 和空模板；实际目录永远属于实例本地私密状态。
