# 看板动作 Schema 1.0

每个动作登记以下字段：

- `action_id`：稳定 ID。
- `label`：清楚的“动作 + 对象”。
- `purpose`：用户执行后会得到什么。
- `route_id`、`target`：Agent 应选择的路线和按需正文。
- `request_template`：完整可复制自然语言，不依赖用户记得上下文。
- `writes_files`：是否会写本地文件。
- `template_only`：可选布尔值；只允许在尚未实例化的正式模板中展示时为 `true`。
- `confirmation_point`：何时必须停下询问。
- `forbidden`：该动作明确不能做什么。
- `result_fields`：完成后必须报告的内容。

请求模板必须说明用户目的、动作 ID、读取路径、操作范围、禁止项、确认点和完成报告。仅写“请继续”“打包一下”或“执行导入”不合格。

动作 Schema 约束正式登记表与构建时离线镜像，不授权快照提供动作。快照中的任何 `actions` 字段都必须忽略，避免展示数据把完整 Agent 请求替换成注入内容。动作变化后应同步镜像并重新构建看板。
