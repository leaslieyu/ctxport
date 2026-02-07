// Types
export type {
  Plugin,
  PluginContext,
  PluginInjector,
  InjectorCallbacks,
  ThemeConfig,
} from "./types";

// Registry
export {
  registerPlugin,
  findPlugin,
  getAllPlugins,
  getAllHostPermissions,
  clearPlugins,
} from "./registry";

// Utils
export { generateId } from "./utils";

// Built-in plugins
export { registerBuiltinPlugins, chatgptPlugin, claudePlugin } from "./plugins";

// Host permissions constant (for WXT config)
import { chatgptPlugin } from "./plugins/chatgpt/plugin";
import { claudePlugin } from "./plugins/claude/plugin";
export const EXTENSION_HOST_PERMISSIONS = [
  ...chatgptPlugin.urls.hosts,
  ...claudePlugin.urls.hosts,
];
