import type { AdapterManifest } from "./schema";
import type { AdapterHooks } from "./hooks";
import { ManifestAdapter } from "./manifest-adapter";
import { registerAdapter, getAdapter } from "../registry";

export interface ManifestEntry {
  manifest: AdapterManifest;
  hooks?: AdapterHooks;
}

const manifests: ManifestEntry[] = [];

/**
 * Create and register an adapter from a manifest + hooks entry.
 */
export function registerManifestAdapter(
  entry: ManifestEntry,
): ManifestAdapter {
  const adapter = new ManifestAdapter(entry.manifest, entry.hooks);
  registerAdapter(adapter);
  manifests.push(entry);
  return adapter;
}

/**
 * Register multiple adapters in bulk.
 */
export function registerManifestAdapters(
  entries: ManifestEntry[],
): ManifestAdapter[] {
  return entries.map(registerManifestAdapter);
}

/**
 * Get all registered manifest entries.
 */
export function getRegisteredManifests(): ManifestEntry[] {
  return [...manifests];
}

/**
 * Clear all registered manifest entries (for testing).
 */
export function clearManifests(): void {
  manifests.length = 0;
}

/**
 * Find a matching ManifestAdapter by host page URL.
 * Used by the extension to determine the current platform's adapter without hardcoding a provider.
 */
export function findAdapterByHostUrl(url: string): ManifestAdapter | null {
  for (const entry of manifests) {
    const matches = entry.manifest.urls.hostPatterns.some((p) => p.test(url));
    if (matches) {
      const adapter = getAdapter(entry.manifest.id);
      return (adapter as ManifestAdapter | undefined) ?? null;
    }
  }
  return null;
}
