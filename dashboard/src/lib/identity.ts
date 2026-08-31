import { getDashboardLocale } from "./i18n";

export type DashboardIdentityKind = "template" | "instance" | "demo" | "unavailable";

export interface DashboardIdentityInput {
  demoMode: boolean;
  state: string;
  displayName: string;
  version: string;
  identityRef?: unknown;
  href: string;
}

export interface DashboardIdentityCapsule {
  kind: DashboardIdentityKind;
  ref: string;
  version: string;
}

export interface DashboardIdentityState {
  expected: DashboardIdentityCapsule;
  incoming: DashboardIdentityCapsule | null;
  incomingPresent: boolean;
  incomingValid: boolean;
  mismatch: boolean;
  mismatchReason: "none" | "incomplete" | "kind" | "ref";
  shouldSyncUrl: boolean;
  title: string;
}

const IDENTITY_KEYS = ["ac_kind", "ac_ref", "ac_version"] as const;
const KIND_VALUES = new Set<DashboardIdentityKind>(["template", "instance", "demo", "unavailable"]);
const REF_PATTERN = /^(?:template|public-demo|unavailable|legacy-instance|ac-[a-f0-9]{12,64})$/;
const VERSION_PATTERN = /^(?:\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?|unknown)$/;

function cleanVersion(value: string): string {
  const candidate = value.trim();
  return VERSION_PATTERN.test(candidate) ? candidate : "unknown";
}

function cleanExpectedRef(kind: DashboardIdentityKind, value: unknown): string {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (REF_PATTERN.test(candidate)) return candidate;
  if (kind === "template") return "template";
  if (kind === "demo") return "public-demo";
  if (kind === "unavailable") return "unavailable";
  return "legacy-instance";
}

function expectedCapsule(input: DashboardIdentityInput): DashboardIdentityCapsule {
  const kind: DashboardIdentityKind = input.demoMode
    ? "demo"
    : input.state === "instance"
      ? "instance"
      : input.state === "template"
        ? "template"
        : "unavailable";

  return {
    kind,
    ref: cleanExpectedRef(kind, input.identityRef),
    version: cleanVersion(input.version),
  };
}

function baseTitle(input: DashboardIdentityInput, kind: DashboardIdentityKind): string {
  if (getDashboardLocale() === "en") {
    if (kind === "demo") return "Online demo · AI Carry";
    if (kind === "template") return "No assistant yet · AI Carry";
    if (kind === "unavailable") return "Dashboard data unavailable · AI Carry";
    const displayName = input.displayName.trim() || "Unnamed assistant";
    return `${displayName} · AI Carry`;
  }
  if (kind === "demo") return "在线演示 · AI Carry";
  if (kind === "template") return "尚未创建助手 · AI Carry";
  if (kind === "unavailable") return "看板数据不可用 · AI Carry";
  const displayName = input.displayName.trim() || "未命名助手";
  return `${displayName} · AI Carry`;
}

function readIncoming(url: URL): {
  capsule: DashboardIdentityCapsule | null;
  present: boolean;
  valid: boolean;
} {
  const present = IDENTITY_KEYS.some((key) => url.searchParams.has(key));
  if (!present) return { capsule: null, present: false, valid: true };

  const hasExactlyOneOfEach = IDENTITY_KEYS.every((key) => url.searchParams.getAll(key).length === 1);
  const kindValue = url.searchParams.get("ac_kind") ?? "";
  const refValue = (url.searchParams.get("ac_ref") ?? "").trim().toLowerCase();
  const versionValue = (url.searchParams.get("ac_version") ?? "").trim();
  const valid = hasExactlyOneOfEach
    && KIND_VALUES.has(kindValue as DashboardIdentityKind)
    && REF_PATTERN.test(refValue)
    && VERSION_PATTERN.test(versionValue);

  if (!valid) return { capsule: null, present: true, valid: false };
  return {
    capsule: {
      kind: kindValue as DashboardIdentityKind,
      ref: refValue,
      version: versionValue,
    },
    present: true,
    valid: true,
  };
}

/**
 * Compare the browser entry capsule with the snapshot identity.
 *
 * The capsule is a diagnostic guard, not an authorization token. A template
 * becoming an instance is the one expected identity transition and is updated
 * in place. Different established instance refs are never silently rewritten.
 */
export function inspectDashboardIdentity(input: DashboardIdentityInput): DashboardIdentityState {
  const expected = expectedCapsule(input);
  const incomingState = readIncoming(new URL(input.href));
  const incoming = incomingState.capsule;

  let mismatchReason: DashboardIdentityState["mismatchReason"] = "none";
  if (!incomingState.valid) mismatchReason = "incomplete";
  else if (incoming) {
    const templateBecomingInstance = incoming.kind === "template"
      && incoming.ref === "template"
      && expected.kind === "instance";
    if (!templateBecomingInstance && incoming.kind !== expected.kind) mismatchReason = "kind";
    else if (!templateBecomingInstance && incoming.ref !== expected.ref) mismatchReason = "ref";
  }

  const mismatch = mismatchReason !== "none";
  const shouldSyncUrl = !mismatch && (
    !incoming
    || incoming.kind !== expected.kind
    || incoming.ref !== expected.ref
    || incoming.version !== expected.version
  );
  const mismatchPrefix = mismatch ? (getDashboardLocale() === "en" ? "Entry mismatch · " : "入口不一致 · ") : "";
  const title = `${mismatchPrefix}${baseTitle(input, expected.kind)}`;

  return {
    expected,
    incoming,
    incomingPresent: incomingState.present,
    incomingValid: incomingState.valid,
    mismatch,
    mismatchReason,
    shouldSyncUrl,
    title,
  };
}

export function syncDashboardIdentity(state: DashboardIdentityState): void {
  document.title = state.title;
  if (!state.shouldSyncUrl) return;

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("ac_kind", state.expected.kind);
    url.searchParams.set("ac_ref", state.expected.ref);
    url.searchParams.set("ac_version", state.expected.version);
    window.history.replaceState(window.history.state, "", url.href);
  } catch {
    // Some hardened local-browser policies may reject file:// history writes.
    // The title and in-page identity still remain available; never turn this
    // portability limitation into a false identity mismatch.
  }
}

