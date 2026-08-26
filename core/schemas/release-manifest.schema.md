# 发布清单 Schema 2.0

每个模板版本提供一份 TOML 清单，包含：

- 产品版本、核心版本、项目 SPDX 许可证标识、扩展接口版本，以及资产、跨会话信号、宿主接入、完整迁移套件、看板和可选专业扩展清单等各数据 Schema 版本。
- `from_versions`：可直接应用的来源范围。
- `replace`：模板拥有、可整体替换的路径与摘要。
- `core/upgrade/official-source.toml` 属于模板核心，目标版本必须携带并按清单替换；Agent 不能通过搜索结果猜测更新来源。
- 根目录社区说明与 `.github/ISSUE_TEMPLATE/` 属于公开项目入口，不拥有个人实例数据。目标版本包含这些文件时按模板核心替换，不把它们误作用户资产迁移。
- `migrate`：需要 Schema 迁移的实例身份路径和迁移说明。
- 当目标版本改变启动入口、正式授权或成熟度证据契约时，`migrate` 必须显式列出 `instance/startup-capsule.toml`、`instance/validations/index.toml` 和受影响的实例地图／清单；不能只靠宽泛 `instance/**` 猜测所有权。
- `migration_rules`：只在来源实例满足明确条件时执行的版本化、有顺序迁移。每条规则必须包含稳定 ID、适用来源版本、前置条件、源和目标、引用更新、碰撞处理、摘要验证与幂等要求；不能只写“智能合并”。目录说明与用户正文发生旧版路径冲突时，必须先迁移并回读用户正文，再允许替换说明。
- `preserve`：必须保留的实例资产和本地私密路径。
- `instance/governance/**` 是混合拥有路径：目标模板提供卡片正文、频率和研究步骤；升级按稳定卡片 ID 迁移实例自己的 `schedule_state`、`schedule_anchor_at`、`last_completed_at`、`next_due_at`、`snoozed_until`、`trigger_revision` 及用户暂停／取消状态。不能整卡覆盖成模板空态，也不能为了保留排期而永远沿用旧模板正文。因此它应进入 `migrate`，并在投影重建前完成字段级合并。
- 跨会话正式状态和延期卡属于 `preserve`；极小唤醒胶囊与非启动时间索引属于可重建投影，可以迁移其结构，但升级验收必须从正式状态元数据校验或重建。
- 宿主注册表和档案属于 `preserve` 的实例元数据；升级可以迁移结构，但不能把上次验证的宿主能力当作升级后当前事实，也不能引入系统提示、凭据或完整宿主记忆。
- `remove`：已废弃模板路径。
- `extension_changes`：扩展接口兼容性。
- `workspace/**` 不能只靠宽泛 Glob 判断。已登记 `workspace/<extension-id>/extension.toml` 时，清单必须声明目标支持的扩展清单 Schema、按清单保留／重建／排除／连接私密集合的行为，以及普通启动不枚举工作区；未登记工作区必须进入冲突而不是被静默认领、删除或打包。
- `instance_component_changes`：目标母版提供的稳定接口集合、支持的实例组件 Schema、适用迁移 ID，以及可选／必需组件不兼容时的保留行为。`instance/components/registry.toml` 必须在 `migrate` 中先完成身份和首次纳管迁移，随后 `instance/components/**` 才能按清单保留；未登记组件目录原样保留并进入冲突，不能自动认领。
- 实例组件清单只允许拥有自己的 `instance/components/<id>/**` 和声明的 `.assistant-local/**` 本机边界；发布清单不能借组件迁移执行未知脚本、复制旧电脑绝对路径、把设备本地内容放进公开包或完整迁移主体。
- `dashboard_changes`：动作与快照变化。
- `verification`：少量风险对应检查。升级类清单至少覆盖动作级回滚、合并后真实快照双份重建、第二次执行无差异、稳定看板入口和平台完整树身份；Windows 权限策略要区分自然继承、显式／受保护 DACL、SACL 与所有者，不能把复制失败或工具退出码单独当成成功。
- Asset Schema 1.3 或更高版本的清单必须说明：风险分级只控制候选观察、验证和复核顺序；正式资产仍需用户明确确认或可核验的既有明确批准；旧 `policy-authorized`、孤立的批准布尔值和模型判断不能直接迁成正式授权。
- 声明能力、SOP 或宿主执行经验成熟度的旧实例必须按已有真实记录建立 `instance/validations/index.toml` 闭包。缺少真实证据时进入 `needs-evidence`／`review`，清单不得授权执行器制造验证记录、批准证据、任务次数或时间。
- 严格启动胶囊是 manifest 的可重建派生物，并必须满足 `startup-capsule.schema.md`。实例化、升级，以及指导方式、学习政策、语言、版本、档案引用或方向变化时，manifest、胶囊和相关派生投影必须处于同一个可恢复事务；胶囊在模型上下文外生成并核对源摘要，失败时整组回滚。
- `target_selection`：目标模板输入的允许集合策略。广义通配符只用于匹配已经固定身份的发布内容或可信提交中的文件；不得从任意开发工作树递归复制 `.git`、`node_modules`、缓存、临时构建目录或维护者私密层。
- `target_selection` 下的 `allow_overrides_deny_for_exact_paths`：只用于公开结构必须保留、同时被宽泛私密目录规则命中的精确占位文件。优先级必须是“deny 胜出，只有本字段逐字列出的路径例外”；不接受 Glob、目录、前缀或调用方追加项。每个例外只允许清单逐字列出的普通零字节文件，不能是符号链接、联接、重解析点、目录或含任意正文的文件；归档中的目录记录只是容器元数据，不算额外文件。任何其他 `.assistant-local`／`.assistant-private` 路径继续失败关闭。
- `[release_boundary]`：Schema 2 的新发布必须区分本地候选与已经存在的官方发布。`status=published-release` 只有在清单来自声明的官方固定标签、相应 Release 对象存在、解压树与固定标签逐路径一致且用户明确授权本次升级时才允许 `instance_replacement_authorized=true`。清单内的历史 `publication_authorized`／`repository_operation_authorized` 只说明形成这一个固定发布的动作已经通过发布门，必须同时声明未来公开动作仍为 false；它不能授权未来的提交、推送、标签、Release 或 Pages，也不能让本地候选冒充已发布来源。
- 文件哈希或内容摘要，用于发现损坏或传输错误。GitHub 自动生成的源码 ZIP 以正式提交／标签、发布清单及解压后的排序文件内容作为耐久身份；ZIP 容器自身可能被重新生成，其一次大小或 SHA-256 只能作为当次传输观察值。

Schema 1 清单仍按原有字段兼容读取；Schema 2 增加上述条件迁移和目标允许集合门。发布清单描述“如何升级”，不能要求实例猜测 Git 历史，也不能静默覆盖用户资产。迁移执行后必须证明第二次运行不再产生差异。
