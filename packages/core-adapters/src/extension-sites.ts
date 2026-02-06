import type { Provider } from "@ctxport/core-schema";
import type {
  ExtensionSiteConfig,
  ExtensionSiteThemeTokens,
} from "./extension-site-types";
import type { AdapterManifest } from "./manifest/schema";
import type { AdapterHooks } from "./manifest/hooks";
import { chatgptManifest, chatgptHooks } from "./adapters/chatgpt/manifest";
import { claudeManifest, claudeHooks } from "./adapters/claude/manifest";

export type { ExtensionSiteConfig, ExtensionSiteThemeTokens };

function manifestToSiteConfig(
  manifest: AdapterManifest,
  hooks?: AdapterHooks,
): ExtensionSiteConfig {
  return {
    id: manifest.provider,
    provider: manifest.provider as Provider,
    name: manifest.name,
    hostPermissions: manifest.urls.hostPermissions,
    hostPatterns: manifest.urls.hostPatterns,
    conversationUrlPatterns: manifest.urls.conversationUrlPatterns,
    getConversationId: (url: string) => {
      if (hooks?.extractConversationId) {
        return hooks.extractConversationId(url);
      }
      for (const pattern of manifest.urls.conversationUrlPatterns) {
        const match = pattern.exec(url);
        if (match?.[1]) return match[1];
      }
      return null;
    },
    theme: manifest.theme,
  };
}

export const CHATGPT_EXT_SITE = manifestToSiteConfig(
  chatgptManifest,
  chatgptHooks,
);
export const CLAUDE_EXT_SITE = manifestToSiteConfig(
  claudeManifest,
  claudeHooks,
);

export const EXTENSION_SITE_CONFIGS: ExtensionSiteConfig[] = [
  CHATGPT_EXT_SITE,
  CLAUDE_EXT_SITE,
];

export const EXTENSION_HOST_PERMISSIONS = EXTENSION_SITE_CONFIGS.flatMap(
  (site) => site.hostPermissions,
);

export const EXTENSION_CONTENT_MATCHES = EXTENSION_HOST_PERMISSIONS;

export const EXTENSION_HOST_PATTERNS = EXTENSION_SITE_CONFIGS.flatMap(
  (site) => site.hostPatterns,
);

export function getExtensionSiteByUrl(url: string): ExtensionSiteConfig | null {
  return (
    EXTENSION_SITE_CONFIGS.find((site) =>
      site.conversationUrlPatterns.some((pattern) => pattern.test(url)),
    ) ?? null
  );
}

export function getExtensionSiteByHost(
  url: string,
): ExtensionSiteConfig | null {
  return (
    EXTENSION_SITE_CONFIGS.find((site) =>
      site.hostPatterns.some((pattern) => pattern.test(url)),
    ) ?? null
  );
}

export function resolveExtensionTheme(
  site: ExtensionSiteConfig | null,
  prefersDark: boolean,
): ExtensionSiteThemeTokens | null {
  if (!site) return null;
  if (prefersDark && site.theme.dark) {
    return site.theme.dark;
  }
  return site.theme.light;
}
