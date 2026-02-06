import { builtinManifestEntries } from "./adapters";
import { getAdapter as _getAdapter } from "./registry";
import { registerManifestAdapter } from "./manifest/manifest-registry";

export {
  registerAdapter,
  unregisterAdapter,
  getAdapters,
  getAdapter,
  getAdaptersMeta,
  parseWithAdapters,
  clearAdapters,
} from "./registry";
export type { ParseResult } from "./registry";

export {
  buildMessages,
  buildConversation,
  generateId,
} from "./base";
export type { AdapterConfig, ConversationOptions, RawMessage } from "./base";

// 从 manifest entries 自动派生，不再需要 extension-sites.ts
export const EXTENSION_HOST_PERMISSIONS = builtinManifestEntries.flatMap(
  (e) => e.manifest.urls.hostPermissions,
);
export const EXTENSION_CONTENT_MATCHES = EXTENSION_HOST_PERMISSIONS;
export const EXTENSION_HOST_PATTERNS = builtinManifestEntries.flatMap(
  (e) => e.manifest.urls.hostPatterns,
);

export function registerBuiltinAdapters(): void {
  for (const entry of builtinManifestEntries) {
    if (!_getAdapter(entry.manifest.id)) {
      registerManifestAdapter(entry);
    }
  }
}
