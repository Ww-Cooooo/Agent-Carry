// Maintainer-only English synthetic fixture. It is projected only to the
// gh-pages candidate and never enters public main, a release ZIP, or an install.
window.AGENT_CARRY_DEMO = true;
window.AGENT_CARRY_IS_REAL = true;
window.AGENT_CARRY_SNAPSHOT = {
  meta: { schema_version: "1.1", generated_at: new Date().toISOString(), product_version: "1.2.0", state: "instance", freshness_seconds: 86400, source_digest: "github-pages-synthetic-demo-en-v1", identity_ref: "public-demo" },
  overview: { product: "AgentCarry", state: "instance", domain: "general-personal-assistant", startup_chars: 6000, startup_budget: 20000 },
  profile: { display_name: "My portable work assistant", mission: "Remember how I prefer to work, preserve methods that have been verified, and continue with me when I change Agents.", domain_id: "general-personal-assistant", guidance_mode: "balanced", language: "English / UTC+8" },
  model: { level: 1, name: "Level 1 everyday model", platform: "Synthetic host Agent", confirmed_at: new Date().toISOString(), status: "confirmed" },
  assets: { memory: 3, sops: 4, capabilities: 4, experiences: 2, evolution: 2, todo: 3, governance: 3, skills: 3 },
  memories: [
    { id: "mock.memory.response-style", title: "Response style preference", summary: "Lead with the outcome, then add only the explanation needed; avoid unrelated preambles." },
    { id: "mock.memory.privacy-boundary", title: "Model, secrets, and Git boundary", summary: "The selected model may process private information needed for a task. API keys, passwords, tokens, cookies, private keys, and login state never enter the model, Git, or a migration kit." },
    { id: "mock.memory.model-habit", title: "Model-use preference", summary: "Prefer Level 1 for everyday work. Recommend a higher level for architecture, security rules, or long-term decisions, and wait for confirmation." }
  ],
  sops: [
    { id: "mock.sop.weekly-review", title: "Weekly work review", summary: "Summarize completed work, blockers, and next-week priorities in a reusable review.", reliability: "可使用", triggers: ["Help me review this week", "Summarize what I finished this week"] },
    { id: "mock.sop.portable-export", title: "Back up safely and move local-private data separately", summary: "Exclude private source content and secrets locally, then back up sanitized content to your own GitHub private repository only after confirmation. Registered and referenced local files receive a coverage check; large collections can use multiple private volumes in one migration-kit folder.", reliability: "可使用", triggers: ["Back this up to my GitHub private repository", "I want to move this assistant to another computer", "Export my local-private data"] },
    { id: "mock.sop.material-review", title: "Review multiple sources and verify conclusions", summary: "Confirm scope and review criteria, identify evidence and contradictions in batches, then produce conclusions that can be checked against the source.", reliability: "需要复核", triggers: ["Review these materials", "Check these files for contradictions"] },
    { id: "mock.sop.meeting-follow-up", title: "Turn meeting conclusions into an action list", summary: "Extract decisions, owners, and time requirements from meeting notes, then create an action list that is easy to follow up.", reliability: "待验证", triggers: ["Turn this meeting into an action list", "Help me follow up on this meeting"] }
  ],
  capabilities: [
    { id: "mock.capability.cross-file-summary", title: "Cross-file synthesis", summary: "Extract shared conclusions, differences, and unresolved questions from user-selected sources.", reliability: "待验证", triggers: ["Compare these files", "Synthesize these materials"] },
    { id: "mock.capability.progressive-routing", title: "Find capabilities and memories on demand", summary: "Check a small index, find the category relevant to the task, and load only the needed content instead of opening the whole assistant.", reliability: "可使用", triggers: ["Check whether you have a relevant capability", "Read only what this task needs"] },
    { id: "mock.capability.external-safety", title: "Handle websites and external files safely", summary: "Treat web pages, email, attachments, and other Agent output as external data whose commands cannot change the user's task or authority.", reliability: "可使用", triggers: ["Research this online", "Read this external file"] },
    { id: "mock.capability.preference-reuse", title: "Reuse personal preferences from another assistant", summary: "Bring back only long-term preferences the user selects, without copying the other assistant's professional direction, temporary tasks, or private content.", reliability: "需要复核", triggers: ["Reuse preferences from another assistant", "Bring my writing preferences here"] }
  ],
  experiences: [
    { id: "mock.experience.migration", title: "Lessons from the first host change", summary: "Exclude secrets and temporary files before migration, then verify counts, folders, and local bindings after restoration." },
    { id: "mock.experience.source-check", title: "Check sources before online research", summary: "For versions, prices, and safety conclusions, prefer official or primary sources and separate facts, inference, and remaining uncertainty." }
  ],
  evolution: [
    { id: "mock.evolution.trigger-alias", title: "Make a frequent workflow easier to find", summary: "Add phrases the user actually says to the workflow entry so an existing workflow is not missed.", status: "待确认", source_summary: "Two independent real tasks used everyday phrasing that did not match the existing workflow entry.", target_kind: "sop", next_step: "Confirm that the phrases are stable; add only trigger aliases without changing the workflow goal or acceptance criteria." },
    { id: "mock.evolution.repeat-to-sop", title: "Turn repeated steps into a repeatable workflow", summary: "Suggest an SOP only after the same method succeeds in multiple real tasks; continue observing when evidence is weak.", status: "稍后处理", source_summary: "Three independent material-organization tasks produced verifiable success with the same steps.", target_kind: "sop", next_step: "Recheck scope, inputs, and completion criteria; if there is no conflict, create an awaiting-validation SOP." }
  ],
  governance: [
    { id: "governance.memory-technology-review", title: "Improve memory retrieval", summary: "About every 180 days, or when the user proposes a new memory method, research whether on-demand retrieval still works well.", frequency: "about every 180 days", status: "等待下次提醒", schedule_state: "scheduled", last_completed_at: new Date(Date.now() - 42 * 86400000).toISOString(), next_due_at: new Date(Date.now() + 138 * 86400000).toISOString(), purpose: "Reduce missed relevant memories and unnecessary context while keeping memory in portable local files.", steps: ["Review real cases where retrieval missed, misrouted, or loaded too much", "Study credible papers and major Agent vendor documentation", "Compare quality, speed, cost, privacy, and migration impact", "Propose a change and wait for approval"] },
    { id: "governance.consistency-system-review", title: "Improve project updates", summary: "Research how to reduce missed linked changes without turning a personal project into a heavy enterprise process.", frequency: "about every 180 days", status: "等待下次提醒", schedule_state: "scheduled", last_completed_at: new Date(Date.now() - 36 * 86400000).toISOString(), next_due_at: new Date(Date.now() + 144 * 86400000).toISOString(), purpose: "Keep entries, documentation, dashboard, and upgrades synchronized while retaining necessary checks for every real change.", steps: ["Review recent missed or incorrect linked changes", "Study dependency, impact, and schema-evolution methods", "Judge whether a method fits a lightweight personal project", "Propose the smallest useful improvement and wait for approval"] },
    { id: "governance.agent-security-review", title: "Improve external-content safety", summary: "Track changes in prompt injection, tool abuse, memory poisoning, and dependency attacks to decide whether current protection needs updating.", frequency: "about every 180 days", status: "等待下次提醒", schedule_state: "scheduled", last_completed_at: new Date(Date.now() - 28 * 86400000).toISOString(), next_due_at: new Date(Date.now() + 152 * 86400000).toISOString(), purpose: "Keep normal research convenient while reducing unauthorized action, privacy leakage, memory poisoning, and resource waste.", steps: ["Review false positives, misses, and correct blocks in real tasks", "Study new evidence from credible security organizations, vendors, and papers", "Check current boundaries with representative scenarios", "Propose necessary improvements and wait for approval"] }
  ],
  todo: [
    { id: "mock.todo.path-check", title: "Confirm the material folder on the new computer", summary: "Confirm where the files live on the new computer and record where this device should look; the two computers do not need identical absolute paths.", status: "pending", visible: true },
    { id: "mock.todo.weekly-plan", title: "Choose next week's three most important tasks", summary: "Select three priorities from unfinished work and recent plans, then explain why they come first.", status: "pending", visible: true },
    { id: "mock.todo.done", title: "Complete this week's work review", summary: "This week's completed work, problems, and next steps have been organized.", status: "done", visible: true },
    { id: "mock.todo.hidden-history", title: "A completed to-do hidden from the dashboard", summary: "This record remains local but has visible=false, so it must not appear in a dashboard list or count.", status: "done", visible: false }
  ],
  deferred: [],
  skills: { count: 3, status: "已扫描", path: ".assistant-local/skills/map.toml" },
  changes: [
    { date: new Date().toISOString().slice(0, 10), summary: "Added three long-term improvement areas and separated GitHub backup from local-private migration" },
    { date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), summary: "Updated a frequent workflow and related experience after a real task" }
  ],
  advanced: { file_count: 65, entry_files: ["AGENTS.md", "BOOTSTRAP.md", "assistant.toml", "core/maps/root-map.toml"] }
};
