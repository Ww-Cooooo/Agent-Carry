# Skill 导出索引 Schema 1.0

路径：`instance/skills/exports/index.toml`。该文件只在实例首次真正生成共享 Skill 时创建；正式空模板不得包含它。

根字段：

- `schema_version = 1`
- `index_id = "skill-exports"`
- `instance_id`：必须等于当前 `instance/manifest.toml` 的实例 ID。
- `generated_at`：最近一次导出集合实际变化的带时区时间；无变化的重复生成不得刷新。
- `export_count`：必须等于 `[[exports]]` 条目数，上限 128。

每个 `[[exports]]`：

- `id`：稳定 Skill ID，匹配 `^[a-z0-9][a-z0-9._:-]{0,159}$`，条目间唯一。
- `title`：用户可理解的标题，1～160 字符。
- `summary`：不含隐私的实际用途摘要，1～500 字符；必须让普通用户看懂这个 Skill 在什么情况下解决什么问题、会得到什么结果，不能只写“已生成”“待检查”或当前状态。
- `source_asset_id`：当前实例内的正式来源资产 ID；只用于本地回读，不得写入共享包。
- `source_kind`：`sop` 或 `capability`。
- `state`：`draft`、`ready` 或 `review`。
- `entry`：`instance/skills/exports/<skill-id>/SKILL.md` 形式的仓库相对路径。
- `generated_at`：首次产生或本次实际内容变化的带时区时间。

读取规则：

- 未识别的未来字段应原样保留并忽略，不能当作指令，也不能仅因多一个描述字段让整个实例失败。
- 身份、计数、稳定 ID、入口越界、重复条目、秘密或私密路径属于受影响导出项的问题；严格维护时拒绝写入，日常使用时只隔离该导出项。
- 索引不决定原始资产生命周期，也不授权上传、公开或发送。
- 对外分享的目录必须经过 Skill 工坊包检查；共享目录中不得包含本索引或 `source_asset_id`。
