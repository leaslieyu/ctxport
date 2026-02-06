import { getAdapter as _getAdapter } from "./registry";
import { registerManifestAdapter } from "./manifest/manifest-registry";
import { chatgptManifest, chatgptHooks } from "./adapters/chatgpt/manifest";
import { claudeManifest, claudeHooks } from "./adapters/claude/manifest";

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

export {
  EXTENSION_SITE_CONFIGS,
  EXTENSION_HOST_PERMISSIONS,
  EXTENSION_CONTENT_MATCHES,
  EXTENSION_HOST_PATTERNS,
  getExtensionSiteByUrl,
  getExtensionSiteByHost,
  resolveExtensionTheme,
  CHATGPT_EXT_SITE,
  CLAUDE_EXT_SITE,
} from "./extension-sites";
export type {
  ExtensionSiteConfig,
  ExtensionSiteThemeTokens,
} from "./extension-sites";

export { chatgptManifest, chatgptHooks, claudeManifest, claudeHooks } from "./adapters";

export function registerBuiltinAdapters(): void {
  if (!_getAdapter(chatgptManifest.id)) {
    registerManifestAdapter({ manifest: chatgptManifest, hooks: chatgptHooks });
  }
  if (!_getAdapter(claudeManifest.id)) {
    registerManifestAdapter({ manifest: claudeManifest, hooks: claudeHooks });
  }
}
