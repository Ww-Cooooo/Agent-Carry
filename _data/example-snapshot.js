// Agent Carry — 正式模板空态回退快照
// 仅当本地真实快照缺失或异常时装载。这里不得放维护者日期、个人资产或演示任务。

if (!window.AGENT_CARRY_SNAPSHOT) {
  window.AGENT_CARRY_IS_REAL = false;
  window.AGENT_CARRY_SNAPSHOT = {
    meta: {
      schema_version: "1.1",
      generated_at: "",
      product_version: "1.4.0",
      state: "template",
      freshness_seconds: 86400,
      source_digest: "template-empty",
      identity_ref: "template"
    },
    overview: {
      product: "AgentCarry",
      state: "template",
      domain: "uninstantiated",
      startup_chars: 0,
      startup_budget: 20000
    },
    profile: {
      display_name: "Agent Carry",
      mission: "把你的记忆、能力与工作方式沉淀为可迁移的个人助手。",
      domain_id: "uninstantiated",
      guidance_mode: "unselected",
      language: "zh-CN / UTC+8"
    },
    assets: {
      memory: 0,
      sops: 0,
      capabilities: 0,
      experiences: 0,
      evolution: 0,
      todo: 0,
      governance: 0,
      skills: 0
    },
    memories: [],
    sops: [],
    capabilities: [],
    experiences: [],
    evolution: [],
    governance: [],
    todo: [],
    deferred: [],
    skills: { count: 0, status: "等待实例化后扫描", path: "" },
    changes: [],
    advanced: {
      file_count: 0,
      entry_files: ["AGENTS.md", "BOOTSTRAP.md", "assistant.toml", "core/maps/root-map.toml"]
    }
  };
}
