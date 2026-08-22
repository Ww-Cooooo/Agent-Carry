# Agent Carry architecture — English overview

Agent Carry is a local, file-based long-term asset and growth layer used beside a host Agent. It is not a background service and it does not replace the host or model.

## Participants

- **User:** states goals and approves important long-term decisions.
- **Host Agent:** reads and writes files, uses tools, and acts in the current environment.
- **Model or model API:** provides understanding, reasoning, planning, and generation.
- **Agent Carry:** stores portable assets and defines how the host routes, loads, validates, improves, and moves them.

The host's inaccessible hidden memory remains in that product. Agent Carry stores only material written into its own files after connection, plus content the user can explicitly provide or export.

## Progressive context

Ordinary startup begins at `BOOTSTRAP.md`, reads `assistant.toml` plus only the small instance manifest, control, and due-signal state needed for routing, then follows `core/maps/root-map.toml` and one matching category map to the few source files the task needs. Detailed protocols, memory bodies, SOPs, capabilities, dynamic signals, and governance content do not all enter context at startup.

Time-based and count-based triggers keep tiny local indexes containing identifiers, counters, due timestamps, and route pointers. A lightweight check can detect a match without loading the full governing document. Only a match opens the relevant route and source content.

## Learning lifecycle

A real task may produce a sourced learning candidate. The current task is corrected first. If the root cause has future value, the candidate records scope, evidence, risk, and authorization. Procedural learning may first become a candidate or an awaiting-validation SOP; repeated validated use raises its maturity, while later failures or environment changes return it to review. Nonprocedural material may become memory, capability, or task experience. Weak, conflicting, obsolete, or repeatedly unused material is reviewed, narrowed, merged, archived, or removed.

The user chooses for the instance either risk-tiered learning or confirmation for every candidate. The instance stores that policy. Risk-tiered learning permits only low-risk, independently revalidated, conflict-free, clearly scoped, reversible content to enter provisional use after user notification; medium- and high-risk content still requires prior confirmation. Authorization to try an asset and its evidence maturity remain separate states.

Users see candidates and state changes on the dashboard and discuss them with the current host Agent. Important, high-risk, identity, privacy, security, architecture, and irreversible decisions require explicit approval.

## Dashboard

The dashboard is a derived, offline projection of formal files. It never becomes the source of truth and never changes files directly. Buttons create bounded natural-language requests for the host Agent. A local snapshot carries an anonymous identity capsule so an entry can detect that it opened the wrong template or instance.

One React codebase serves Simplified Chinese and English. Simplified Chinese is the canonical default. `dashboard.en.html` supplies the English installation hint; a visible language control can override and remember the choice for that local dashboard. Reviewed product copy is translated from a controlled catalog. Unknown text—including user-authored memories and professional materials—stays in its original language.

Agent Carry-owned geographic copy follows one Chinese-canonical protocol. The reviewed English forms are `Taiwan, China`, `Hong Kong SAR, China`, and `Macao SAR, China`; none is presented as a sovereign state. The same gate covers source copy, the compiled offline dashboard, and the synthetic Pages projection. Maps, flags, and country/region grouping require Level 3 semantic review. User-authored content and quoted source evidence remain verbatim rather than being silently normalized.

## Ownership and upgrades

Template-owned core files may be replaced or migrated by a versioned release manifest. Instance identity and user assets are preserved. Derived maps are rebuilt from preserved assets. Dashboard code is replaced while the local snapshot is preserved or regenerated. Conflicts stop and become explicit choices; instance assets are never silently overwritten.

The authoritative detailed architecture remains [architecture.md](architecture.md).
