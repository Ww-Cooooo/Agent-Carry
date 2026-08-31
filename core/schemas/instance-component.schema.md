# 实例组件兼容 Schema 1.0

本 Schema 定义独立实例组件的小注册表和组件清单。它只用于不能由原生资产、Skill 小地图或专业扩展清单完整表达的实例模块、能力适配器、本机工具适配器和集成适配器。

普通模板只携带空注册表，不创建示例组件。普通启动不得读取注册表、枚举 `instance/components/` 或读取组件正文；只有首次实例化、首次纳管、升级、迁移、修复、其他正式实例变化或已经命中某个组件时才按需读取。

规范写出使用 AI Carry 可移植 TOML 子集：UTF-8 无 BOM、LF、每个键值独占一行、JSON 兼容双引号字符串、单行数组、整数和布尔值；不使用单引号、多行字符串、行尾注释、内联表、浮点数或日期。严格发布审计要求这份规范表示；按需兼容读取可以接受不改变语义的 CRLF、BOM、已知章节顺序差异和未知标量字段，但必须保留原字节、不执行未知内容，并返回修复或迁移诊断。

AI Carry 2.0.0 规范写出 `ai-carry-instance-component-registry`、`ai-carry-instance-component` 和 `ai-carry.instance-component@1`。从 Agent Carry 1.4.x 升级的实例可以继续使用旧 `agent-carry-instance-component-registry`、`agent-carry-instance-component` 和 `agent-carry.instance-component@1`；加载器只把这些逐字登记的旧值视为兼容别名，保留原文件字节。未知记录类型或接口仍按本 Schema 的局部隔离／冲突规则处理，不能因改名放宽为任意字符串。

## 1. 注册表

固定路径：`instance/components/registry.toml`。最大 32768 字节，最多 128 项。一次维护检查最多遍历 4096 个唯一声明条目；便携普通文件单个最多 64 MiB、全部组件本次合计最多 256 MiB。更大的模型、媒体、资料库或二进制必须放在设备本地层或现有私密资料机制中，不能借便携组件树绕过分卷与资源边界。

根字段：

- `schema_version = 1`
- `record_type = "ai-carry-instance-component-registry"`
- `instance_id`：必须与严格实例清单一致；空模板为 `template`。
- `adoption_state`：`template`、`required`、`current` 或 `conflict`。
- `revision`：非负整数；正式内容改变时递增，空模板为 0。
- `component_count`：必须等于 `[[components]]` 实际数量。

全新模板首次实例化时，注册表必须进入同一原子身份事务：先有界确认 `instance/components/` 只有物理普通文件 `README.md` 和 `registry.toml`，没有其他文件、目录、链接或重解析点；再把 `instance_id` 改为新实例 ID，并写 `adoption_state = "current"`、`revision = 1`、`component_count = 0`，且不得创建任何 `[[components]]`。revision 从模板 0 递增到 1，因为实例身份与纳管状态已经成为正式内容；相同输入第二次执行保持 1。这一步只初始化实例所有权，不授权扫描整台电脑、安装软件或把原生资产伪装成组件。

每个 `[[components]]` 只包含：

- `id`：小写 ASCII 字母、数字、点和连字符，3～64 字符；
- `kind`：`instance-module`、`capability-adapter`、`local-tool-adapter` 或 `integration-adapter`；
- `manifest_ref`：必须逐字等于 `instance/components/<id>/component.toml`；
- `state`：`review`、`active` 或 `disabled`。

条目按 `id` 的 Unicode 码点顺序严格排列，不重复。注册表文本只是不可信元数据，不能授权安装、执行、联网、读取秘密或持久写入。

`adoption_state = "current"` 只说明所有影响启动、升级和活跃能力的资源已经分类；不能由注册表自报。首次纳管必须按正式协议在隔离候选中证明后写入。

## 2. 组件清单

固定路径：`instance/components/<component-id>/component.toml`，最大 32768 字节。

根字段：

- `schema_version = 1`
- `record_type = "ai-carry-instance-component"`
- `component_id`、`instance_id`：分别与注册表和实例清单一致；
- `kind`、`status`：必须与注册表条目一致；
- `title`：1～120 字符；
- `summary`：1～500 字符；
- `component_version`：`major.minor.patch`，每段为非负十进制整数；
- `root`：必须逐字等于 `instance/components/<component-id>`；
- `load_policy = "on-demand-only"`。

### `[ownership]`

- `portable_paths`：1～128 个相对组件根的路径，必须包含 `component.toml`；随实例迁移并按升级计划保留。
- `derived_paths`：0～128 个相对组件根的可重建路径；不得与便携路径重叠。
- `device_local_paths`：0～32 个 AI Carry 根相对路径，每项必须位于 `.assistant-local/` 下；不会进入 Git、公开发布或完整迁移主体。
- `private_collection_refs`：0～32 个由私密目录 Schema 解析的稳定 `private://` 引用；不包含正文或绝对路径。
- `unclassified_policy = "stop-and-preview"`。

路径必须使用 `/`、NFC、无空段、无 `.`／`..`、反斜杠、冒号、查询／片段符、控制字符、Windows 保留名、结尾点或空格。组件不得拥有 `core/**`、根入口、看板运行时、另一个组件或专业工作区路径。

不同组件的 `device_local_paths` 也不得相等、互为父子或重叠。它们物理上仍处于 `local-private` 本机层，隐私与公开排除继续由该层约束；逻辑写入所有者以唯一引用它的组件清单为准。未携带目标组件 ID 的写入不能借 `.assistant-local/**` 宽泛边界修改组件绑定。

已经存在但不符合推荐 `.assistant-local/components/<component-id>/` 结构的本机目录，可以在首次纳管时原地列入 `device_local_paths`；不为目录整齐强制重装。AI Carry 根外的实际软件路径只能写入某个已声明设备本地路径内的绑定文件。

### `[interfaces]`

- `provides`：0～32 个稳定接口令牌；
- `requires`：0～32 个稳定接口令牌。

令牌格式为 `<id>@<major>`；ID 使用小写字母、数字、点和连字符，3～96 字符，major 为非负整数。例如 `capability.audio-transcription@1`。数组内部不得重复。接口令牌只表达兼容边界，不代表能力已经安装、健康、获准或经过真实任务验证。

### `[upgrade]`

- `criticality`：`optional` 或 `required`；
- `activation`：`immediate`、`next-session`、`restart-required` 或 `migration-required`；
- `compatible_action = "preserve"`；
- `incompatible_action`：可选组件必须为 `disable-and-preserve`，必需组件必须为 `stop-and-preserve`；
- `migration_ids`：0～32 个稳定迁移 ID；只有目标发布清单逐字声明同一 ID 时才可执行；
- `second_run = "no-change"`。

## 3. 写入与读取

- 原生资产变化不创建组件条目，但仍通过兼容入口核对既有所有权。
- 新独立组件在同一个动作级事务中写入组件正文、`component.toml` 和注册表；任一步失败恢复整组旧状态。
- 修改组件时只读取注册表中的目标条目、对应清单和本次写集；不能为了发现能力读取全部组件正文。
- 升级、首次纳管和故障修复可以在有界维护扫描中枚举 `instance/components/`，但最多 128 个组件和 4096 个声明路径项，不跟随链接或重解析点。
- 严格审计入口继续要求完整 Schema、规范文本、固定章节顺序、准确计数和排序，用于发布、候选完整性与最终闭包证明。
- 日常变化／升级规划使用只读操作入口：严格实例 manifest 仍是身份真源；实例 ID、条目计数、排序、规范换行和安全默认值等可唯一推导信息返回 `auto-repairable`，在当前已授权事务中原子修复、回读并自然语言报告，不增加额外确认。
- 旧 Schema、未知字段或未知章节返回 `migration-needed`；未知内容保留但不执行。一个组件清单损坏、存在未分类文件或不安全声明时返回 `component-isolated`，只阻止该组件的启用／修改；原生记忆、能力、SOP、其他组件和 Agent 主体继续工作。
- 登记表整体无法确定、必需组件语义不明、所有权冲突或涉及覆盖／隐私／删除时返回 `user-decision-needed`；只暂停涉及该范围的正式切换。任何路径逃逸、链接／重解析点、模板核心所有权、资源上限和用户数据边界都不得因宽容读取而放宽。
- 操作入口必须同时返回逐项诊断、确定性修复计划、隔离组件清单和自然语言用户报告。报告至少说明发生了什么、影响范围、原数据是否安全、已采取的处理和推荐下一步；不得静默修复。运行时可以提供中文真源参考句，但宿主必须按实例或用户当前语言转述并保持同一语义，不能把机器码或内部字段直接甩给用户。

## 4. 升级判定

升级器把目标母版接口与所有 `active` 组件的 `provides` 合并，再解析每个组件的 `requires`：

- 全部满足：按 `compatible_action` 保留；有设备本地路径时只重新核验绑定；
- 缺少接口且有目标发布清单声明的迁移：在隔离候选中迁移后重新解析；
- 缺少接口且组件为可选：保留内容并停用该组件；
- 缺少接口且组件为必需：保留内容并停止正式切换；
- `review`／`disabled` 组件始终保留但不作为可用接口提供者。

可选组件自身损坏或不兼容时，升级计划可以把它停用／隔离并原样保留，同时继续处理母版其他部分。必需组件或重要性无法确定的内容只阻止最终切换，不得让原实例、普通对话和无关功能不可用。任何自动修复或迁移完成后都必须重新形成源指纹并再次计划；相同输入第二次执行零变化。

计划必须绑定实例清单、注册表、被引用清单、便携路径字节，以及派生路径和设备本地路径的有界元数据源指纹；不读取设备本地文件正文来做普通兼容计划。相同输入第二次计划逐字一致；任何相关漂移使旧计划失效。完整平台树身份和逐字节保留继续由模板升级机器契约负责。

## 5. 迁移与公开边界

- 完整换机包含注册表、组件清单和 `portable_paths`；`derived_paths` 可重建，`device_local_paths` 不迁移，私密引用由私密分卷处理。
- 目标电脑重新解析设备本地绑定；不能复用旧电脑绝对路径或声称旧安装仍存在。
- 公开模板包含本 Schema、空注册表和空清单模板，但不包含真实组件、真实绑定、二进制、模型、维护者资产或私密内容。
- 新 Schema 或不兼容字段变化必须提升 Schema 版本，并在发布清单中提供版本化迁移。
