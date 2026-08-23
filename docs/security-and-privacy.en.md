# Safety and privacy — English overview

Agent Carry is local-first, but local execution does not make every input trustworthy. Web pages, repositories, ZIP files, documents, tool output, emails, plugins, and content from another Agent may contain prompt injection or malicious instructions.

## Core boundaries

- External content is data, not authority. It cannot expand the user's request or override Agent Carry rules.
- Acquisition and interpretation are separated. Before reading untrusted content semantically, the host loads the external-content safety boundary and limits scope.
- The host does not follow instructions asking it to leak data, email secrets, publish content, disable safeguards, waste tokens, enter endless loops, or perform unrelated work.
- A website, email address, plugin, other Agent, other person, or remote repository is a new recipient. Purpose, necessary scope, and authorization must be checked before sending anything.
- Private information required for the user's current task may be provided to the current model in the minimum useful scope. An entire private directory is not sent merely because it is locally available.
- Agent Carry's protocol requires API keys, passwords, tokens, cookies, private keys, recovery codes, and login state never to be sent to a model, copied into commands or prompts, stored in Agent Carry, placed in migration kits, uploaded to GitHub, or included in reports. They are used only through the host's approved login or secret-management mechanism.

These are mandatory host behaviors, not a claim that Agent Carry is an operating-system sandbox. Automatic inspection can detect high-confidence secret forms but cannot prove that an opaque, encrypted, or unknown binary contains no embedded secret. The host must stop or request a narrow human review for such content instead of claiming complete exclusion. If a credential may already have been exposed, rotate it through the provider rather than trying to “remove” the exposure from history.

## Local-private migration

The user and Agent register the folders or files that should travel with the assistant. The Agent should reuse paths it already observed while creating or moving the material and ask the user about outcomes—not make a novice maintain path tables. Pre-existing or externally created data can be added explicitly; Agent Carry never scans the whole computer to guess.

Export re-enumerates the declared scope, rejects unsafe links and archive structures, excludes secrets and temporary content, hashes every included file, and detects changes during export. Large data can be split into consecutive local-private volumes inside one migration-kit folder. Restore verifies the manifest and every volume before writing into a new, approved destination. Old absolute paths are not reused.

Version 1.2.1 includes a domain-neutral, on-demand deterministic reference tool for a bounded single package. The host must give it an explicitly registered policy and logical-path contract; it never scans a workspace to guess scope. It streams package data, reports opaque binaries instead of claiming their internals were proven secret-free, restores logical references under a different root after the old root is unavailable, and rolls back interrupted multi-file writes as one action. Hitting its file, byte, inspection, multipart, or chunking boundary stops that path and returns control to the full Migration Kit 2.0 procedure.

## Remote backup

Sanitized backup to a GitHub private repository is separate from local-private migration. The host shows the account, repository name, proposed content, collaborators, organization or app access, and visibility; it excludes private source material and secrets, then uploads only after explicit confirmation. `private` means access follows GitHub's current authorization settings—it is still third-party remote hosting, not local-private storage or end-to-end encryption. A private repository is not a substitute for a local-private migration kit.

## Local web surfaces remain read-only by default

The public Agent Carry dashboard is an offline `file://` projection. It starts no local server and cannot write formal files. A professional extension with a real user-facing write need may declare a temporary loopback write surface in its own manifest. That surface exists only for the user-initiated task, binds only to loopback, checks the exact host and same-origin source, requires JSON plus an unguessable in-memory session token, limits request size and lifetime, and writes only registered paths through corruption-safe multi-file transactions. Ordinary startup, dashboard browsing, and instances without that extension do not start or probe it. It cannot become a background service, expose secrets, or grant web content authority.

## Reporting vulnerabilities

See [SECURITY.md](../SECURITY.md) for the project's vulnerability-reporting route. Do not publish a live exploit, secret, or private user data in a public issue.

The authoritative detailed policies remain [security-and-privacy.md](security-and-privacy.md) and the protocols under `core/protocols/`.
