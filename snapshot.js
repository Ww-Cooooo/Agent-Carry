// Maintainer-only synthetic fixture. It is never copied into public main,
// the release ZIP, or an installed Agent Carry. The Level 3 publishing flow
// may project it into the public repository's gh-pages branch only.
window.AGENT_CARRY_DEMO = true;
window.AGENT_CARRY_IS_REAL = true;
window.AGENT_CARRY_SNAPSHOT = {
  meta: { schema_version: "1.1", generated_at: new Date().toISOString(), product_version: "1.1.0", state: "instance", freshness_seconds: 86400, source_digest: "github-pages-synthetic-demo-v2" },
  overview: { product: "AgentCarry", state: "instance", domain: "general-personal-assistant", startup_chars: 6000, startup_budget: 20000 },
  profile: { display_name: "我的随身工作助手", mission: "记住我的习惯，把验证过的做法沉淀下来，换一个 Agent 也能继续使用。", domain_id: "general-personal-assistant", guidance_mode: "balanced", language: "简体中文 / UTC+8" },
  model: { level: 1, name: "Level 1 日常模型", platform: "示例宿主 Agent", confirmed_at: new Date().toISOString(), status: "confirmed" },
  assets: { memory: 3, sops: 4, capabilities: 4, experiences: 2, evolution: 2, todo: 3, governance: 3, skills: 3 },
  memories: [
    { id: "mock.memory.response-style", title: "回答风格偏好", summary: "默认先给结论，再补充必要解释；避免无关铺垫。" },
    { id: "mock.memory.privacy-boundary", title: "当前模型、秘密凭据与 Git 边界", summary: "当前选定模型可按任务需要处理隐私；API 密钥、密码、令牌、Cookie、私钥和登录态不进入模型、Git 或隐私迁移包。" },
    { id: "mock.memory.model-habit", title: "模型使用习惯", summary: "日常任务优先使用 Level 1；修改架构、安全规则或作出长期决定时，再建议使用更高等级模型，并等待用户确认。" }
  ],
  sops: [
    { id: "mock.sop.weekly-review", title: "每周工作复盘", summary: "汇总本周完成事项、阻塞与下周优先级，形成可直接复用的复盘稿。", reliability: "可使用", triggers: ["帮我做本周复盘", "整理一下这周完成的工作"] },
    { id: "mock.sop.portable-export", title: "备份到 GitHub 私密仓库，并单独迁移本地隐私", summary: "先在本地检查准备上传的内容，你确认后再备份到自己的 GitHub 私密仓库。隐私内容另存为本地迁移包，密钥需要在新设备上重新配置。", reliability: "可使用", triggers: ["备份到 GitHub 私密仓库", "我要换电脑继续用这个助手", "导出本地隐私包"] },
    { id: "mock.sop.material-review", title: "审阅多份材料并核对结论", summary: "先确认材料范围和检查标准，再分批找出证据、矛盾和遗漏，最后给出可以回到原文核对的结论。", reliability: "需要复核", triggers: ["帮我审阅这些材料", "检查这批文件有没有矛盾"] },
    { id: "mock.sop.meeting-follow-up", title: "把会议结论整理成行动清单", summary: "从会议记录中找出决定、负责人和时间要求，再整理成方便继续跟进的行动清单。", reliability: "待验证", triggers: ["把这次会议整理成行动清单", "帮我跟进会议结论"] }
  ],
  capabilities: [
    { id: "mock.capability.cross-file-summary", title: "跨文件归纳", summary: "从用户指定的多份材料中提炼共同结论、差异和待核实项。", reliability: "待验证", triggers: ["对比这些文件", "归纳这批材料"] },
    { id: "mock.capability.progressive-routing", title: "按需寻找能力和记忆", summary: "先查看小目录，找到与当前任务有关的分类，再只读取真正需要的内容，避免一次打开整个助手。", reliability: "可使用", triggers: ["找一下你有没有相关能力", "只读取完成这件事需要的内容"] },
    { id: "mock.capability.external-safety", title: "安全处理网页和外部文件", summary: "读取网页、邮件、附件或其他 Agent 的内容时，会先把它们当作外部资料，不会让资料中的命令改变你的任务或授权。", reliability: "可使用", triggers: ["帮我联网查资料", "读取这个外部文件"] },
    { id: "mock.capability.preference-reuse", title: "复用另一个助手里的个人偏好", summary: "只带回你主动选择的长期偏好，不复制对方的专业方向、临时任务或隐私内容。", reliability: "需要复核", triggers: ["复用另一个助手的偏好", "把我的表达习惯带过来"] }
  ],
  experiences: [
    { id: "mock.experience.migration", title: "第一次换 Agent 时的迁移经验", summary: "迁移前先排除密钥和临时文件，迁移后核对内容数量、目录和本机路径。" },
    { id: "mock.experience.source-check", title: "联网查资料时先核对来源", summary: "涉及版本、价格和安全结论时，优先使用官方或一手资料，并把事实、推断和仍待确认的部分分开。" }
  ],
  evolution: [
    { id: "mock.evolution.trigger-alias", title: "让常用流程更容易被找到", summary: "把你平时真正会说的话补充到流程入口中，减少明明已经有流程、Agent 却没有找到的情况。", status: "待确认", source_summary: "来自两次独立真实任务：用户使用日常说法时，都没有命中已经存在的流程入口。", target_kind: "sop", next_step: "先和用户核对这些说法是否稳定；确认后只补充触发语，不改动流程目标和验收标准。" },
    { id: "mock.evolution.repeat-to-sop", title: "把反复出现的步骤整理成固定流程", summary: "同一种做法在多次真实任务中都有效时，再建议整理成固定流程；证据不足时继续观察。", status: "稍后处理", source_summary: "来自三次彼此独立的材料整理任务，这组步骤都得到了可核对的成功结果。", target_kind: "sop", next_step: "再核对适用范围、输入和完成标准；没有冲突时整理成一项待验证的固定流程。" }
  ],
  governance: [
    { id: "governance.memory-technology-review", title: "记忆查找方式改进", summary: "大约每 180 天，或者你主动提出新的记忆方法时，研究现在的按需读取是否仍然合适。", frequency: "约每 180 天", status: "等待下次提醒", schedule_state: "scheduled", last_completed_at: new Date(Date.now() - 42 * 86400000).toISOString(), next_due_at: new Date(Date.now() + 138 * 86400000).toISOString(), purpose: "减少该记得的内容没找到、无关内容却被读进来的情况，同时让记忆继续保存在本地文件中，方便换 Agent 后携带。", steps: ["回看真实任务中找漏、找错和读取过多的情况", "调研可信论文和主要 Agent 厂商的技术资料", "比较效果、速度、成本、隐私和迁移影响", "提出保留或改进建议，等待你批准"] },
    { id: "governance.consistency-system-review", title: "项目更新方式改进", summary: "研究一次修改涉及多个地方时，怎样减少漏改，又不把个人项目做成复杂的企业流程。", frequency: "约每 180 天", status: "等待下次提醒", schedule_state: "scheduled", last_completed_at: new Date(Date.now() - 36 * 86400000).toISOString(), next_due_at: new Date(Date.now() + 144 * 86400000).toISOString(), purpose: "让入口、说明、看板和升级内容更容易一起更新，减少维护负担；每次真实修改仍然需要完成必要检查。", steps: ["回看最近修改中漏掉或改错的地方", "研究依赖关系、影响范围和数据格式升级方法", "判断新方法是否适合轻量个人项目", "给出尽量小的改进方案，等待你批准"] },
    { id: "governance.agent-security-review", title: "联网和外部内容安全改进", summary: "跟踪提示词注入、工具滥用、记忆污染和依赖投毒的新变化，判断现有防护是否需要更新。", frequency: "约每 180 天", status: "等待下次提醒", schedule_state: "scheduled", last_completed_at: new Date(Date.now() - 28 * 86400000).toISOString(), next_due_at: new Date(Date.now() + 152 * 86400000).toISOString(), purpose: "让普通联网任务继续顺畅，同时降低外部内容诱导越权、泄露隐私、污染记忆或浪费资源的风险。", steps: ["回看真实任务中拦错、漏拦和正确拦截的情况", "调研可信安全机构、厂商和论文的新证据", "用有代表性的场景检查现有边界", "提出必要改进，等待你批准"] }
  ],
  todo: [
    { id: "mock.todo.path-check", title: "确认新电脑资料目录", summary: "确认新电脑上的资料位置，并记录这台电脑应该去哪里查找；不要求两台电脑的文件内容相同。", status: "pending", visible: true },
    { id: "mock.todo.weekly-plan", title: "整理下周最重要的三件事", summary: "从未完成事项和近期安排中挑出三项优先任务，并说明为什么先做它们。", status: "pending", visible: true },
    { id: "mock.todo.done", title: "完成本周工作复盘", summary: "已经整理本周完成事项、遇到的问题和下周需要继续的内容。", status: "done", visible: true },
    { id: "mock.todo.hidden-history", title: "已经从看板隐藏的历史待办", summary: "这条记录仍保存在本机，但 visible=false，因此不应出现在任何看板列表或计数中。", status: "done", visible: false }
  ],
  deferred: [],
  skills: { count: 3, status: "已扫描", path: ".assistant-local/skills/map.toml" },
  changes: [{ date: new Date().toISOString().slice(0, 10), summary: "补充三项长期改进，并把 GitHub 备份和本地隐私迁移分开说明" }, { date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), summary: "在一次真实任务后更新了常用流程和相关经验" }],
  advanced: { file_count: 65, entry_files: ["AGENTS.md", "BOOTSTRAP.md", "assistant.toml", "core/maps/root-map.toml"] }
};
