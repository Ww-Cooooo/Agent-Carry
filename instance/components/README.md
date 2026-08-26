# 实例组件

这里保存不能由普通记忆、能力、SOP、Skill 小地图或专业工作区完整表达的独立实例组件。

- `registry.toml` 只登记稳定 ID、类型、状态和清单位置；普通启动不读取。
- 每个组件使用 `instance/components/<component-id>/component.toml` 声明便携、派生、设备本地和私密边界，以及提供／需要的稳定接口。
- 本地软件路径、二进制、模型和缓存不写进本目录；它们只在组件声明的 `.assistant-local/**` 本机绑定中记录。
- 不要直接修改 `core/**` 或其他模板拥有路径。需要改变母版行为时使用正式扩展点、适配器或版本化迁移。

完整规则见 `core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md` 与 `core/schemas/instance-component.schema.md`。
