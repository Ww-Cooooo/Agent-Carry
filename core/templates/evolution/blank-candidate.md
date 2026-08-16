+++
id = "evolution.replace-me"
kind = "evolution-candidate"
status = "candidate"
title = "待审核进化候选"
summary = "拟新增、修改、关联、替代、归档或删除什么"
triggers = []
scope = []
excludes = []
lifecycle = "review"
expected_next_use = ""
topic_key = ""
subject_key = ""
aliases = []
conditions = []
target_kind = ""
target_subtype = ""
candidate_relation = "new"
claim_summary = ""
proposed_risk_tier = "high"
independent_event_count = 1
successful_event_count = 0
failed_event_count = 0
distinct_context_count = 0
representative_event_ids = []
last_evidence_at = ""
remind_at = ""
snoozed_until = ""
trigger_revision = 0
source_refs = []
private_refs = []
supersedes = []
minimum_level = 2
approval_state = "pending"
activation_basis = "candidate"
risk_tier = "high"
approved_by_user = false
updated_at = ""
+++
# 核心主张与未来价值

说明真正学到了什么、未来在哪类任务中有用；没有长期价值时不要创建本候选。

# 来源、独立证据与限制

区分当前用户、Agent Carry 资产、宿主观察、宿主协作记忆、模型推断、外部内容和未知来源。说明独立事件怎样去重、有哪些反例和未验证项；只有最终通过 `core/protocols/RESULT_VALIDATION.md` 的事件才能增加成功数，同一事件内修正不重复累计。

# 同类匹配与关系判断

记录通过领域地图和小型元数据找到的少量候选 ID，说明为何属于重复、细化、条件分支、冲突、关联、替代、新建或无法确定。不得为去重加载整库正文。

# 风险与建议动作

说明风险等级、准备新增／修改／合并／关联／替代／归档／删除什么，以及为什么满足或不满足低风险学习政策。

# 给用户的简短说明

只保留用户需要决定或知道的内容：学到了什么、依据、适用范围、是否已进入可撤销试用、如何撤销；不要暴露内部噪声。
