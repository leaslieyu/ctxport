import { registerPlugin } from "../registry";
import { chatgptPlugin } from "./chatgpt/plugin";
import { claudePlugin } from "./claude/plugin";

export function registerBuiltinPlugins(): void {
  registerPlugin(chatgptPlugin);
  registerPlugin(claudePlugin);
}

export { chatgptPlugin } from "./chatgpt/plugin";
export { claudePlugin } from "./claude/plugin";
