+++
id = "experience.host-execution.replace-me"
kind = "experience"
subtype = "host-execution"
status = "candidate"
title = "待命名宿主执行经验"
summary = "当前宿主怎样满足某份可携带核心的能力需求"
triggers = []
scope = []
excludes = []
lifecycle = "environment-bound"
expected_next_use = ""
topic_key = "host-execution"
subject_key = ""
aliases = []
conditions = []
source_refs = []
private_refs = []
supersedes = []
minimum_level = 1
approval_state = "pending"
activation_basis = "candidate"
risk_tier = "high"
approved_by_user = false
portable_core_ref = ""
host_profile_refs = []
environment_scope = []
validity_signals = []
maturity = "unvalidated"
independent_task_count = 0
successful_use_count = 0
failed_use_count = 0
last_validated_at = ""
validation_refs = []
updated_at = ""
+++
# 对应的可携带核心

写稳定资产 ID 和本经验负责满足的语义能力需求，不复制能力或 SOP 正文。

# 当前宿主与环境范围

说明经验证的宿主档案、版本／权限／环境条件，以及哪些变化会使本经验需要复核。不要保存设备指纹、凭据、隐藏提示或私人绝对路径。

# 已验证的能力映射

按“核心需要什么 → 当前宿主怎样实现 → 最小验证是什么”描述。路径、命令或界面方法只能作为当前参考，不能改写核心目标和安全边界。

# 执行方法与检查点

说明观察当前状态、选择等价入口、执行、验证和回退的顺序。原入口失效时先按语义重新定位。

# 限制、失效信号与降级

列出权限、版本、媒体、工具或环境限制；命中失效信号时停止沿用本经验，回到可携带核心重新映射。

# 证据与成熟度

只记录真实独立任务。只有最终通过 `core/protocols/RESULT_VALIDATION.md` 的结果才计成功，同一事件内修正不重复累计；一次成功可进入低风险可撤销试用，重复验证后最高为 `reliable`，永远不能标为 `portable`。
