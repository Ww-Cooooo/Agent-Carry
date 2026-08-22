import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ENGLISH_TEXT } from "./i18n-catalog";

export type DashboardLocale = "zh-Hans" | "en";

const STORAGE_PREFIX = "agent-carry:dashboard-locale:";
const LOCALE_QUERY_KEY = "ac_lang";

function localeStorageKey(): string {
  const path = `${window.location.pathname}|${document.baseURI}`;
  let hash = 2166136261;
  for (let index = 0; index < path.length; index += 1) {
    hash ^= path.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${STORAGE_PREFIX}${(hash >>> 0).toString(16)}`;
}

function queryLocale(): DashboardLocale | null {
  try {
    const value = new URL(window.location.href).searchParams.get(LOCALE_QUERY_KEY)?.trim().toLowerCase();
    if (value === "en" || value === "en-us" || value === "en-gb") return "en";
    if (value === "zh" || value === "zh-cn" || value === "zh-hans") return "zh-Hans";
  } catch {
    // A hardened local browser can limit URL access. Chinese remains the safe default.
  }
  return null;
}

function storedLocale(): DashboardLocale | null {
  try {
    const value = window.localStorage.getItem(localeStorageKey());
    return value === "en" || value === "zh-Hans" ? value : null;
  } catch {
    return null;
  }
}

export function resolveInitialLocale(): DashboardLocale {
  return storedLocale() ?? queryLocale() ?? "zh-Hans";
}

let runtimeLocale: DashboardLocale = typeof window === "undefined" ? "zh-Hans" : resolveInitialLocale();

export function getDashboardLocale(): DashboardLocale {
  return runtimeLocale;
}

function updateDocumentLanguage(locale: DashboardLocale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = "ltr";
  document.documentElement.dataset.locale = locale;
}

export function setDashboardLocale(locale: DashboardLocale, persist = true): void {
  runtimeLocale = locale;
  updateDocumentLanguage(locale);
  if (!persist) return;
  try {
    window.localStorage.setItem(localeStorageKey(), locale);
  } catch {
    // Language switching still works for this session when storage is unavailable.
  }
}

function preserveOuterWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

const DYNAMIC_TRANSLATIONS: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^当前助手[：·]\s*(.+)$/u, (match) => `Current assistant · ${match[1]}`],
  [/^当前可携带资产\s*(\d+)\s*项$/u, (match) => `${match[1]} portable assets`],
  [/^第\s*(\d+)\s*步$/u, (match) => `Step ${match[1]}`],
  [/^第\s*(\d+)\s*步[，,]\s*共\s*(\d+)\s*步$/u, (match) => `Step ${match[1]} of ${match[2]}`],
  [/^第\s*(\d+)\s*步[，,]\s*共\s*(\d+)\s*步\s*·\s*(.+)$/u, (match) => `Step ${match[1]} of ${match[2]} · ${localizeText(match[3])}`],
  [/^共\s*(\d+)\s*项$/u, (match) => `${match[1]} items`],
  [/^已经保存\s*(\d+)\s*项内容$/u, (match) => `${match[1]} saved items`],
  [/^待办事项\s*(\d+)\s*个$/u, (match) => `${match[1]} to-dos`],
  [/^(\d+)\s*项(.+)$/u, (match) => `${match[1]} ${localizeText(match[2])}`],
  [/^(.+?)\s*(\d+)\s*项$/u, (match) => `${localizeText(match[1])} ${match[2]}`],
  [/^了解“(.+)”$/u, (match) => `Learn what “${localizeText(match[1])}” means`],
  [/^当前确认：Level\s*(\d+)$/u, (match) => `Currently confirmed: Level ${match[1]}`],
  [/^这条内容当前处于“(.+)”状态。$/u, (match) => `This item is currently “${localizeText(match[1])}.”`],
  [/^约\s*(\d+)\s*分钟$/u, (match) => `about ${match[1]} min`],
  [/^约\s*(\d+)\s*小时$/u, (match) => `about ${match[1]} hr`],
  [/^约\s*(\d+)\s*天$/u, (match) => `about ${match[1]} days`],
  [/^更新于\s*(.+)$/u, (match) => `Updated ${match[1]}`],
];

export function localizeText(value: string): string {
  if (runtimeLocale !== "en" || !value.trim()) return value;
  const trimmed = value.trim();
  const exact = ENGLISH_TEXT[trimmed];
  if (exact) return preserveOuterWhitespace(value, exact);
  for (const [pattern, render] of DYNAMIC_TRANSLATIONS) {
    const match = trimmed.match(pattern);
    if (match) return preserveOuterWhitespace(value, render(match));
  }
  return value;
}

export function dashboardLanguageTag(): string {
  return runtimeLocale === "en" ? "en" : "zh-CN";
}

export function localizeAgentRequest(request: string): string {
  if (runtimeLocale !== "en") return request;
  return `# Agent Carry request from an English dashboard

You are the current host Agent connected to this Agent Carry. Communicate with the user in clear English throughout this task, including questions, previews, warnings, choices, progress updates, and the final verification report.

Treat English as the current interaction language unless the user asks for another language. During first-time instantiation, include that language preference in the complete preview instead of silently reverting to the template's Chinese placeholder. Never translate or rewrite user-authored memories, professional terms, source files, or local-private data merely because the dashboard is in English.

The canonical operational request below is stored in Simplified Chinese so Agent Carry has one maintained protocol instead of separate language-specific logic. Read it completely and follow its meaning exactly. Do not omit its routing, confirmation, privacy, security, model-level, preservation, or reporting requirements. Do not ask the user to translate it. When a choice is needed, explain the concrete options and consequences in plain English; assume the user may be new to Agents or programming without treating them as incapable.

Secrets such as API keys, passwords, tokens, cookies, private keys, recovery codes, and login state must never be copied into model prompts, migration files, GitHub repositories, or reports. Use only the host Agent's approved login or secret-management mechanism.

--- BEGIN CANONICAL AGENT CARRY REQUEST ---

${request}

--- END CANONICAL AGENT CARRY REQUEST ---`;
}

type LocaleContextValue = {
  locale: DashboardLocale;
  setLocale: (locale: DashboardLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleRoot({ children }: { children: (locale: DashboardLocale) => ReactNode }) {
  const [locale, setLocaleState] = useState<DashboardLocale>(() => {
    const initial = resolveInitialLocale();
    setDashboardLocale(initial, false);
    return initial;
  });
  const setLocale = useCallback((next: DashboardLocale) => {
    setDashboardLocale(next);
    setLocaleState(next);
  }, []);
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children(locale)}</LocaleContext.Provider>;
}

export function useDashboardLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useDashboardLocale must be used inside LocaleRoot");
  return value;
}
