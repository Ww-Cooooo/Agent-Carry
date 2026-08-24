+++
id = "memory.replace-me"
kind = "memory"
subtype = "general"
status = "candidate"
title = "待命名记忆"
summary = "一句话说明"
triggers = []
scope = []
excludes = []
lifecycle = "unknown"
expected_next_use = ""
topic_key = ""
subject_key = ""
aliases = []
conditions = []
source_refs = []
private_refs = []
supersedes = []
minimum_level = 1
confirmation = "risk-dependent-before-action"
approval_state = "pending"
activation_basis = "candidate"
risk_tier = "high"
approved_by_user = false
updated_at = ""
+++
# 当前有效内容

只写完成未来任务所需的稳定信息，不写无关聊天。原始隐私需要长期保存时放入受 Git 排除的本地隐私层，本记忆只保留低敏摘要和稳定引用；任务命中后，当前执行模型可以按需取得必要隐私正文。API 密钥、密码、令牌、Cookie、私钥、恢复码和登录态不得写入任何记忆或提供给模型。区分用户直接表达、宿主协作记忆、模型推断与外部事实。

# 适用条件与例外

说明在什么范围和时间条件下有效；存在不同条件的偏好时保存为条件分支，不互相覆盖。

如果这是用户习惯，把 `subtype` 改为 `habit`，并使用用户当前交流语言说明以后在哪类任务中会自动采用、哪些情况不采用、用户怎样纠正或要求停止沿用。用户不需要记住本文件标题；把已确认的日常说法整理进少量 `triggers`／`aliases`，包含隐私的原句只做低敏改写。

# 历史与替代关系

需要保留变化原因时，只引用被替代资产 ID、旧结论摘要和有效时间；普通任务不加载历史正文。
