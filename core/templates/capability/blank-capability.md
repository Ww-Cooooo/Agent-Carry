+++
id = "capability.replace-me"
kind = "capability"
status = "candidate"
title = "待命名能力"
summary = "一句话说明它帮助完成什么"
triggers = []
scope = []
excludes = []
lifecycle = "recurring"
expected_next_use = ""
topic_key = ""
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
maturity = "unvalidated"
independent_task_count = 0
successful_use_count = 0
failed_use_count = 0
distinct_host_count = 0
last_validated_at = ""
validation_refs = []
host_experience_refs = []
updated_at = ""
+++
# 目的与非目标

说明能力解决什么问题，以及它明确不负责什么。不能只写能力名称。

# 触发、排除与所需资产

写清用户表达、任务状态或输入特征怎样命中；哪些相似情况不能使用；执行前还要按 ID 加载哪些记忆、SOP 或安全边界。

# 输入、输出与质量标准

说明必需输入、可选输入、缺失输入怎样处理、输出形式和可检查的质量标准。不要假设宿主一定支持某种文件、媒体或工具。

# 参与者职责

分别说明基础模型负责的理解／判断、宿主负责的执行／证据、Agent Carry 负责的资产／来源治理，以及什么必须由用户决定。

# 可携带判断方法

按顺序写清观察、判断、分支、取舍和停止条件。对目标与边界明确，对易变实现保持自适应；不依赖固定按钮、坐标、绝对路径、产品名或旧版本命令。

# 宿主能力需求与动态匹配

用开放语义描述需要达到的结果，例如“能够读取用户指定资料并返回可核对来源”，不要封闭列举宿主产品。宿主先根据当前环境映射和最小验证；可用经验只从 `host_experience_refs` 中按当前宿主选择一个。

# 自主边界、确认点与安全

写清哪些低风险判断可以自主完成，哪些变化会扩大权限、外发数据、覆盖正式资产或产生不可逆后果，必须停下询问。涉及外部内容时保留来源并应用安全边界。

# 验证、失败与降级

说明每个关键结果怎样核对、失败怎样诊断、允许几次有根据的修正、何时缩小范围、换方法、换宿主或停止。来源／契约约束、正式多文件变化或准备计入学习证据时，按 `core/protocols/RESULT_VALIDATION.md` 用新的阅读轮次复核；不能把“没有报错”或模型自称通过当成完成。

# 用户可见结果

规定最终要用普通语言告诉用户什么：实际完成、验证证据、限制、需要决定的事项，以及本次是否形成学习。

# 成熟度与学习更新

只记录真实独立任务证据；只有最终 `validated` 才增加成功次数，同一事件内修正最多计一次。更新成功／失败次数和最多 5 个代表性引用。授权不等于可靠，宿主专属实现另写为宿主执行经验。
