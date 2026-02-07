import type { ManifestEntry } from "../manifest/manifest-registry";
import { chatgptManifest, chatgptHooks } from "./chatgpt/manifest";
import { claudeManifest, claudeHooks } from "./claude/manifest";

/** All built-in adapter manifest entries. To add a new adapter, just add a line here. */
export const builtinManifestEntries: ManifestEntry[] = [
  { manifest: chatgptManifest, hooks: chatgptHooks },
  { manifest: claudeManifest, hooks: claudeHooks },
];
