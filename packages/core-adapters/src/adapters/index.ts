import type { ManifestEntry } from "../manifest/manifest-registry";
import { chatgptManifest, chatgptHooks } from "./chatgpt/manifest";
import { claudeManifest, claudeHooks } from "./claude/manifest";

/** 所有内置 adapter 的 manifest entries。新增 adapter 只需在这里加一行。 */
export const builtinManifestEntries: ManifestEntry[] = [
  { manifest: chatgptManifest, hooks: chatgptHooks },
  { manifest: claudeManifest, hooks: claudeHooks },
];
