# 地图条目 Schema 1.0

分类地图中的每个 `routes` 条目必须包含：

- `id`：稳定、唯一、用于看板动作和跨文件引用。
- `summary`：一到两句说明能做什么，不包含完整执行规则。
- `triggers`：用户表达、状态或动作 ID 的小型示例。
- `target`：被命中后才读取的唯一正文或下一级实例地图。
- `state`：`active`、`provisional`、`on-demand`、`diagnostic-only`、`maintenance-only`、`gated-heavy` 等明确状态。`provisional` 路线只在范围精确匹配时试用，不能覆盖冲突的 active 路线或授权高影响动作。
- `minimum_level`：1、2 或 3。
- `confirmation`：`none` 或具体确认门。

实例资产路线为支持不全量读取的同类匹配，可以增加：

- `asset_kind`、`topic_key`、`subject_key`；
- `aliases`、`scope`、`conditions`；
- `related_asset_ids`。

这些字段只复制资产 frontmatter 的低敏、小型检索语义，不复制正文、证据、隐私或宿主实现。新学习先用这些字段返回少量候选 ID；只有无法判断关系时才读取候选 frontmatter 或正文。字段缺失时可以渐进补齐，不能为升级一次扫描全部资产正文。

实例化后的第一项真实任务可以暂时登记为 `asset_kind = "task-family"`。这是一个保留的**非资产路由标记**：它没有对应的资产 frontmatter，`target` 必须指向真实存在的实例说明文件，`state` 使用 `on-demand`；它只帮助找到首项任务，不能进入资产生命周期、资产计数、看板资产数组或“可使用”状态。首项任务经过真实结果验证并获得保存授权后，应创建新的正式资产正文，再把新增或更新的资产路线指向该正文；不要把原任务族直接改名冒充资产。

门禁必须由地图条目暴露；不能要求 Agent 先阅读全文才能知道该文件不应读取。目标不存在、ID 重复、普通路线直连重型维护正文或未登记目标，均视为路由错误。
