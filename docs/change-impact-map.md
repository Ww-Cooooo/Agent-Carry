# 变更影响说明

唯一机器地图是 `core/maps/component-map.toml`；完整修改质量原则是按需协议 `core/protocols/COMPONENT_CHANGE.md`。启动只保留“准备发生正式持久变更”这个极小事件族；只读检查、普通任务和既有资产使用不加载完整协议。本页只给维护者解释：

- 修改正式所有者时，跟随 `depends_on` 和 `projects_to` 更新引用和投影。
- 新组件必须加入组件地图；删除或移动必须清除旧路径。
- 入口、地图、Schema、触发注册表、唤醒／时间投影、看板动作、快照、项目／第三方许可证和升级说明是最容易遗漏的联动点。
- 新增“达到条件后执行动作”的语义时，先在触发注册表归类；具体规则默认不能进入启动入口。
- 正式变更交付前按 `RESULT_VALIDATION.md` 重新比较变更依据与最终文件，并只做相关的来源、解析、稳定 ID、引用、投影和边界检查；裸写“已通过”不是验收。
- 处理顺序固定为：先从根因修好问题，再证明用户数据与使用可靠性，最后减少无意义的流程和用户负担。内部验证可以充分，不能把终端、回归和内部字段转嫁给普通用户。
- 实例正式资产变化还要做地图—frontmatter 可达性闭包；升级遇到被实时引用的目录说明时，必须先迁移用户正文和引用，再替换说明。
- 启动入口变化同时命中 `startup-capsule-runtime` 与 `instance-startup-capsule`：前者拥有严格加载、生成和校验逻辑，后者是实例自己的可重建投影；严格实例清单先在模型外生成有界胶囊，普通启动只读胶囊。版本、身份或清单变化后必须在同一事务中重建并核对摘要，不能让原始展示文字提前进入上下文。
- 成熟度、成功计数或宿主可携带性变化同时命中 `result-validation` 与 `instance-validation-evidence`：代表性 `validation_refs` 必须在按需证据索引中闭合；旧标签缺证据时进入 needs-evidence/review，不能补造记录。
- `dashboard-ui` 不再拥有 `dashboard/scripts/**` 或两份 `snapshot.js`。修改自然语言检索、候选事务、启动胶囊或快照生成器时分别命中 `asset-retrieval-runtime`、`learning-signal-runtime`、`startup-capsule-runtime` 或 `snapshot-runtime`；两份真实快照由 `dashboard-snapshot-projection` 拥有，再按投影关系检查界面、升级和公开发布。
- 私密迁移语义变化还要同步私密目录 Schema、迁移套件 Schema、模板、`private_refs`、触发注册表、看板动作、升级保留、README 与私密到公开发布检查；实际目录、绑定和正文都不能进入公开候选。
- 专业工作区变化先命中 `professional-extension-contract`：同步扩展清单 Schema、`workspace/**` 所有权、主体／隐私迁移边界、升级冲突、派生快照与公开发布分类。没有扩展的实例必须保持零变化；未登记工作区不能被递归认领。
- 实例安装、更新、删除软件／Skill／模型／功能，或学习、进化形成正式持久资产时，同时命中 `instance-evolution-compatibility`。原生资产和专业扩展复用现有所有者；只有真正独立的模块或适配器进入小型组件注册表。既有实例先在隔离候选中一次性纳管，再升级；普通使用不扫描组件，也不增加一轮用户确认。
- 独立组件变化要同步 `instance/components/registry.toml`、目标 `component.toml`、便携／派生／本机边界、接口闭包和版本化迁移。可选不兼容组件保留并停用，必需不兼容组件保留并停止切换；本机软件绑定只复核，不进入公开候选或换机主体。
- 人机选择语义变化以 `core/protocols/USER_GUIDANCE.md` 为正式所有者；同步极小启动基线、交流方式定义、宿主接入提示词、相关任务协议、看板动作、升级说明和公开 README。详细协议仍须按需加载，不能把每个示例塞进启动上下文。
- 看板布局、卡片数量、动效、滚动或 Three.js 生命周期变化时，同步 `docs/dashboard-design.md`、正式离线 `dashboard/dist/`、升级验证项和 Pages 合成投影；真实浏览器同时检查屏外延迟绘制、卡片是否以 `.app-main` 为观察根并在进入屏幕时逐张呈现、单一滚动所有者、预留高度稳定、滚动期间三维让帧、减少动态、横向溢出、控制台与外部请求。
- 用户可见语言入口、英文 README／安装说明、看板受控词库或语言选择逻辑变化时，同步更新 `docs/localization.md`、`README.en.md`、`INSTALL.en.md`、`START-HERE.en.txt`、`dashboard.en.html`、Pages 英文演示、组件地图、升级清单和公开发布允许集合。内部协议保持中文单一真源，不能复制出两套可能漂移的安全或迁移规则。
- Agent Carry 自有内容新增或修改国家、地区、行政区划、地图、旗帜或国家／地区选择器时，按需加载 `core/protocols/TERRITORY_TERMINOLOGY.md`，同步中英文看板、README／安装入口、无障碍标签、复制请求、Pages 演示、升级检查和私密到公开门禁。用户原文与来源证据保持原样；地图、旗帜和复杂主权语境必须由 Level 3 做人工语义复核，不能只相信自动扫描。
- 每次真实变更当场完成联动；长期治理 TODO 只研究如何改进这套机制。

普通任务不需要读取本页或完整修改协议。
