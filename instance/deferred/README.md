# 延期模型任务

只有用户同意把当前任务延期到更高等级模型时，才从 `core/templates/deferred/blank-deferred-work.md` 创建卡片。

- 普通启动不读取卡片正文；`instance/maps/signal-map.toml` 只保存所有时间触发中的最早唤醒时间和总数。
- 到达最早时间后，先读取 `instance/maps/time-trigger-map.toml` 的小型元数据；用户选中一项后才读取对应卡片。
- 创建、改期、暂停、完成或删除卡片时，同步时间索引和启动胶囊，并遵守跨会话更新事务。
- `remind_at` 是提示检查时间，不代表后台执行、自动切换模型或自动恢复任务。
- 完成或拒绝后按用户需要保留最小历史，否则删除卡片并清除其时间投影。

