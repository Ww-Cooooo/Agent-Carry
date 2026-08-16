+++
id = "governance.agent-security-review"
kind = "governance"
status = "active"
title = "外部内容与 Agent 安全长期改进"
summary = "周期性研究提示词注入、工具滥用、记忆污染和 Agent 供应链的新防御。"
triggers = ["运行安全治理长期TODO", "研究新的Agent攻击"]
frequency_days = 180
background = false
minimum_level = 3
approved_by_user = false
schedule_state = "uninitialized"
schedule_anchor_at = ""
last_completed_at = ""
next_due_at = ""
snoozed_until = ""
trigger_revision = 0
+++
# 原始目的

联网和读取外部内容时必须防止提示词注入、隐私外传、工具诱导、资源耗尽和记忆污染。威胁会变化，因此约每 180 天、或用户主动提出新安全技术并明确要求时，研究是否需要更新紧凑边界和深层协议。

# 每轮必须做什么

1. 复盘真实拦截、误报、漏报和对普通任务效率的影响。
2. 联网研究可信安全机构、主要模型/Agent 厂商、同行评审论文和有复现实证的安全研究；区分真实威胁、概念演示和营销内容。
3. 覆盖直接/间接提示词注入、跨 Agent 委托、MCP/工具输出、浏览器与文档攻击、供应链、数据外传、权限提升、记忆投毒和资源耗尽。
4. 评估防御是否能让 Level 1 正常联网工作，又不过度审批和干扰任务。
5. 提出紧凑边界、深层协议、任务包或工具权限的改进；用户批准后才更新正式规则。

本卡平时不进入上下文，不后台监控，不自动联网。启动时只比较聚合后的最早唤醒时间；到期并由用户选择本项后才读取本卡。任何调研本身也必须先加载现有外部内容安全边界。
