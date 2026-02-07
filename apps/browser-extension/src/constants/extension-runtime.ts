import { getAllPlugins } from "@ctxport/core-plugins";

export const CTXPORT_COMPONENT_NAME = "ctxport-root";

export const EXTENSION_RUNTIME_MESSAGE = {
  COPY_CURRENT: "ctxport:copy-current",
  TOGGLE_BATCH: "ctxport:toggle-batch",
} as const;

export const EXTENSION_WINDOW_EVENT = {
  URL_CHANGE: "ctxport:url-change",
  COPY_SUCCESS: "ctxport:copy-success",
  COPY_ERROR: "ctxport:copy-error",
  TOGGLE_BATCH: "ctxport:toggle-batch",
} as const;

export type ExtensionRuntimeMessageType =
  (typeof EXTENSION_RUNTIME_MESSAGE)[keyof typeof EXTENSION_RUNTIME_MESSAGE];

export function isSupportedTabUrl(url?: string): boolean {
  if (!url) return false;
  return getAllPlugins().some((p) => p.urls.match(url));
}
