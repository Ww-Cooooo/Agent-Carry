import type { ElementType, Key } from "react";
import { Fragment, jsxDEV as reactJsxDEV, type JSXSource } from "react/jsx-dev-runtime";
import { localizeJsxProps } from "./jsx-runtime";

export type { JSX } from "react";

export { Fragment };

export function jsxDEV(
  type: ElementType,
  props: Record<string, unknown> | null,
  key: Key | undefined,
  isStaticChildren: boolean,
  source?: JSXSource,
  self?: unknown,
) {
  return reactJsxDEV(type, localizeJsxProps(type, props), key, isStaticChildren, source, self);
}
