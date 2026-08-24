# Result Validation Evidence Index Schema 1.0

这份模型外索引为正式能力、SOP 与宿主执行经验的成熟度提供低敏闭包。它不是普通启动材料，也不是任务日志；只有成熟度核对、资产维护、升级或快照重建时按需读取。

固定位置为 `instance/validations/index.toml`，文件上限 256 KiB、当前证据记录上限 1024。它不进入普通启动上下文。根字段必须且只能是：

- `schema_version = 1`
- `index_id = "result-validations"`
- `instance_id`：必须等于实例清单身份；模板为 `template`
- `state`：`empty | current`；模板只能为 `empty`
- `source_revision`：非负整数
- `generated_at`：实例 current 状态使用带时区时间；模板空索引为 `""`
- `budget_bytes = 262144`
- `overflow = false`；超限时停止成熟度声明并进入维护，不能截断后假装完整
- `record_count`：必须等于实际 `[[validations]]` 数量

每条 `[[validations]]` 必须且只能包含：

```toml
id = "validation.example"
asset_id = "sop.example"
outcome = "success"
task_event_id = "task-event.example"
context_id = "context.example"
host_experience_ref = "experience.host-execution.example"
environment_ref = "environment.example"
validated_at = "2026-08-24T10:00:00+08:00"
result_protocol = "result-validation-v1"
source_revision = 1
```

- 所有 ID 都是低敏稳定 ID；`host_experience_ref` 与 `environment_ref` 不适用时可为空。
- `outcome` 只能为 `success | failure`，必须来自已完成的 `core/protocols/RESULT_VALIDATION.md` 结果，不能用“没有报错”或模型自称成功代替。
- `(asset_id, task_event_id)` 必须唯一。`task_event_id` 代表一次独立真实任务事件；同一任务内反复修正不能制造多条独立成功。`context_id` 是与任务事件分开的更高层实质使用情境，因此 3 次独立成功可以分布在 2 个不同情境中；同一情境内的另一项真实独立任务可以增加任务次数，但不能伪造新的情境。
- `portable` 还必须由至少两个有效宿主执行经验引用和对应验证记录共同证明；单个自报宿主计数不能通过。
- 正式资产的 `validation_refs` 最多保留 5 个代表记录 ID；它不是全部证据清单。成熟度、独立任务、成功、失败、情境和宿主计数必须从索引中该资产的全部当前记录确定性重算。没有列入 `validation_refs` 的失败记录仍必须阻断 `reliable` / `portable`，不能靠省略引用隐藏失败。
- 达到容量 80% 时，由 `core/maps/trigger-registry.toml` 的 `result-validation-evidence-capacity` 规则在“本来就要写入／重建索引”的检查点投影一条去重的 Level 3 维护路线；普通启动不读取本索引。维护任务只整理已经被更高质量证据替代的旧成功记录，未解决失败不能为了腾空间而被隐藏。整理后，资产计数按保留的当前证据重新计算；历史总使用次数不能冒充当前成熟度证据。
