import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
import { localizeText } from "../i18n";

const LOCALIZED_ATTRIBUTES = new Set(["aria-label", "aria-description", "title", "placeholder", "alt"]);

function localizeChild(value: unknown): unknown {
  if (typeof value === "string") return localizeText(value);
  if (Array.isArray(value)) return value.map(localizeChild);
  return value;
}

function localizeProps(props: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!props) return props;
  let next: Record<string, unknown> | null = null;
  const assign = (key: string, value: unknown) => {
    if (!next) next = { ...props };
    next[key] = value;
  };

  if ("children" in props) {
    const value = localizeChild(props.children);
    if (value !== props.children) assign("children", value);
  }
  for (const key of LOCALIZED_ATTRIBUTES) {
    const value = props[key];
    if (typeof value !== "string") continue;
    const localized = localizeText(value);
    if (localized !== value) assign(key, localized);
  }
  return next ?? props;
}

export { Fragment };

export function jsx(type: unknown, props: Record<string, unknown> | null, key?: unknown) {
  const sourceText = typeof type === "function" && (type as { agentCarrySourceText?: boolean }).agentCarrySourceText === true;
  return reactJsx(type as never, (sourceText ? props : localizeProps(props)) as never, key as never);
}

export function jsxs(type: unknown, props: Record<string, unknown> | null, key?: unknown) {
  const sourceText = typeof type === "function" && (type as { agentCarrySourceText?: boolean }).agentCarrySourceText === true;
  return reactJsxs(type as never, (sourceText ? props : localizeProps(props)) as never, key as never);
}
