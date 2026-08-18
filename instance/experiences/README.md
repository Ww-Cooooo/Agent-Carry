# 精炼真实任务经验（实例拥有）

- 格式：Markdown + 前置元数据。
- 模板：`core/templates/experience/blank-experience.md`。
- 宿主执行经验模板：`core/templates/experience/blank-host-execution.md`。

## 怎样找到一条经验

正式小型索引只有 `instance/maps/domain-map.toml` 一份；命中相关能力或 SOP 后才按需读取经验正文。本说明不再维护第二张手工表，避免地图、正文和看板出现三份不同状态。

## 规则

- 记录任务类型、结果、用户反馈、关键偏差、自我修正与关联资产。
- 保持短小并脱敏；不使用真实姓名、名单或路径。
- `subtype=host-execution` 只记录当前宿主怎样满足某份可携带核心、验证范围、限制和失效信号；不复制核心正文，不保存凭据或隐藏提示。
- 宿主执行经验按相关能力／SOP 的引用和当前宿主筛选，使用时最多展开一个；环境变化后重新验证，成熟度最高为 `reliable`。
