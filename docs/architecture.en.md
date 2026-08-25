# Agent Carry architecture — English overview

Agent Carry is a local, file-based long-term asset and growth layer used beside a host Agent. It is not a background service and it does not replace the host or model.

## Participants

- **User:** states goals and approves important long-term decisions.
- **Host Agent:** reads and writes files, uses tools, and acts in the current environment.
- **Model or model API:** provides understanding, reasoning, planning, and generation.
- **Agent Carry:** stores portable assets and defines how the host routes, loads, validates, improves, and moves them.

The host's inaccessible hidden memory remains in that product. Agent Carry stores only material written into its own files after connection, plus content the user can explicitly provide or export.

## Progressive context

Ordinary startup begins at `BOOTSTRAP.md` and a strict, model-external `instance/startup-capsule.toml`. The capsule contains only allowlisted identity and routing fields plus a digest of the validated source manifest; raw display text and unknown manifest fields never enter model context before that boundary is established. The host then follows `core/maps/root-map.toml` and one matching category map to the few source files the task needs. Validation records, detailed protocols, memory bodies, SOPs, capabilities, dynamic signals, professional workspaces, and governance content do not all enter context at startup.

Time-based and count-based triggers keep tiny local indexes containing identifiers, counters, due timestamps, and route pointers. A lightweight check can detect a match without loading the full governing document. Only a match opens the relevant route and source content.

Users do not need exact asset names, file paths, IDs, or internal kinds. Ordinary wording is compared only with low-sensitive route metadata such as the intended result, subject, summary, familiar phrases, scope, conditions, exclusions, and current status. One broad word is never enough for a confident match. For a fuzzy request with one clear candidate, the host names the old approach in plain language and asks whether that is the intended one before loading its source. An explicitly named approach or a dashboard action with a stable ID follows the deterministic route without repeating the same confirmation. Two or three materially different candidates become a human-readable choice. If four or more remain, the host narrows them again using metadata and shows at most three plus “none of these”; it does not read every body or guess.

The instance domain map has a deterministic capacity contract: 32 KiB or 96 routes is the evaluation threshold, while 48 KiB, 128 routes, and 2 KiB per route are hard limits. A related durable change checks these values without adding a startup scan. The map is never silently truncated. A write that would exceed a hard limit stays unactivated and raises one deduplicated Level 3 evaluation route for an optional local, rebuildable search layer. The source Markdown and TOML remain authoritative, and any derived engine returns at most three low-sensitive candidates rather than becoming a fourth context layer.

## Learning lifecycle

A real task may reveal a reusable preference, method, correction, or failure recovery. The current task is delivered and verified first. At a natural checkpoint, the host explains in the user's language what it noticed and where it may help, then asks whether to keep it, observe it, revisit it later, or discard it; the user does not classify it as memory, capability, SOP, or experience. Before that choice, a one-off inference remains task-local and creates no durable candidate, index entry, signal, or reminder. “Do not save,” refusing the tiny reminder record, and no response produce zero durable state. “Observe” creates a minimal candidate whose later evidence may be accumulated. “Revisit later” creates that same minimal, reversible candidate and a reminder that refers only to its ID and revision, then tells the user what was saved and how to cancel it; a source-less reminder is invalid. Risk-tiered learning can prioritize validation and review only for an already authorized observation; it cannot create a formal asset.

Candidate metadata lives in the bounded, rebuildable `instance/evolution/index.toml`, which is opened only after a learning signal and returns at most three entries. Candidate source references are normalized repository-relative paths and are treated as untrusted data until the source frontmatter identity, kind, and revision are read back. Procedural learning may later become an awaiting-validation SOP; repeated validated use raises maturity, while later failures or environment changes return it to review. Weak, conflicting, obsolete, or repeatedly unused material is reviewed, narrowed, merged, archived, or removed.

The user chooses either risk-tiered candidate handling or confirmation at every candidate step. The instance stores that policy. Risk tier changes validation and review priority; every formal asset still requires the user's explicit confirmation of its content and scope, or a verifiable existing approval from the same user's Agent Carry master. Authorization to use an asset and its evidence maturity remain separate states.

Users see candidates and state changes on the dashboard and discuss them with the current host Agent. Important, high-risk, identity, privacy, security, architecture, and irreversible decisions require explicit approval.

A user-confirmed communication or work habit is still a memory with `subtype=habit`, not a fifth asset type. It appears in “My habits,” can be corrected through the current host in natural language, and can be stopped while retaining an on-demand history or permanently removed after explicit confirmation. Active habits may be used when scope matches. A user-authorized provisional habit may be tried only within its confirmed scope. Review, history, candidate, missing-authorization, and unknown states fail closed and are never described as automatic.

## Dashboard

The dashboard is a derived, offline projection of formal files. It never becomes the source of truth and never changes files directly. Buttons create bounded natural-language requests for the host Agent. A local snapshot carries an anonymous identity capsule so an entry can detect that it opened the wrong template or instance.

One React codebase serves Simplified Chinese and English. Simplified Chinese is the canonical default. `dashboard.en.html` supplies the English installation hint; a visible language control can override and remember the choice for that local dashboard. Reviewed product copy is translated from a controlled catalog. Unknown text—including user-authored memories and professional materials—stays in its original language.

Agent Carry-owned geographic copy follows one Chinese-canonical protocol. The reviewed English forms are `Taiwan, China`, `Hong Kong SAR, China`, and `Macao SAR, China`; none is presented as a sovereign state. The same gate covers source copy, the compiled offline dashboard, and the synthetic Pages projection. Maps, flags, and country/region grouping require Level 3 semantic review. User-authored content and quoted source evidence remain verbatim rather than being silently normalized.

## Ownership and upgrades

Template-owned core files may be replaced or migrated by a versioned release manifest. Instance identity and user assets are preserved. Derived maps are rebuilt from preserved assets. Dashboard code is replaced while the local snapshot is preserved or regenerated. Conflicts stop and become explicit choices; instance assets are never silently overwritten.

Version 1.3.1 retains 1.3.0's separated dashboard-runtime ownership, strict startup capsule, on-demand `instance/validations/index.toml`, and Asset Schema 1.3. It repairs the published-release authority and permits only nine exact regular zero-byte `.assistant-*` placeholders while every other local/private path remains denied. An upgrade from 1.2.1 still adds missing confirmation gates conservatively to both the formal asset frontmatter and its direct route. Legacy policy-authorized assets remain in review unless the same user's real prior approval can be independently verified. Practiced, reliable, or portable labels without enough real indexed evidence become needs-evidence or review; migration never creates approval or validation records. Manifest changes and capsule regeneration are one recoverable transaction, so a failed update cannot leave a new manifest with a stale template capsule.

Version 1.2.1 adds an optional ownership manifest for professional workspaces. A registered extension separates portable content, rebuildable output, device-local state, and references to private collections without adding any ordinary-startup reads. An unregistered workspace is preserved and shown as a conflict rather than guessed or deleted. Upgrade and repair operate in an isolated candidate, treat a multi-file change as one recoverable action, verify the platform's full tree identity, rebuild both dashboard snapshots from merged instance truth, and check a stable local entry before adoption. Exact browser-address access is useful evidence, but it is not the only way to prove a valid local dashboard when independent entry, resource, identity, non-error, and result checks agree.

The same release adds a domain-neutral, on-demand deterministic helper for bounded local-data migration. An instance or registered extension supplies an exact policy and `ac-path:<scope>/<relative-path>` contract; the helper does not discover a domain by scanning. It streams package bytes, restores against the target instance and registered data root rather than an old absolute path, treats external inputs as items to re-supply, and uses a recoverable multi-file import transaction. Its single-package result never substitutes for Migration Kit 2.0 multipart, chunking, or complete-coverage proof.

The authoritative detailed architecture remains [architecture.md](architecture.md).
