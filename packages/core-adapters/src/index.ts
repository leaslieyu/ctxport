import {
  chatGPTExtAdapter as _chatGPTExtAdapter,
  claudeExtAdapter as _claudeExtAdapter,
} from "./adapters";
import {
  registerAdapter as _registerAdapter,
  getAdapter as _getAdapter,
} from "./registry";

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
  BaseExtAdapter,
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

export {
  ChatGPTExtAdapter,
  chatGPTExtAdapter,
  ClaudeExtAdapter,
  claudeExtAdapter,
} from "./adapters";

export function registerBuiltinAdapters(): void {
  if (!_getAdapter(_chatGPTExtAdapter.id)) {
    _registerAdapter(_chatGPTExtAdapter);
  }
  if (!_getAdapter(_claudeExtAdapter.id)) {
    _registerAdapter(_claudeExtAdapter);
  }
}
