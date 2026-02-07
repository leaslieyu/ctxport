import { EXTENSION_HOST_PERMISSIONS } from "@ctxport/core-plugins";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "wxt";
import { toUtf8 } from "./scripts/vite-plugin-to-utf8";

export default defineConfig({
  manifest: {
    name: "CtxPort",
    description: "Copy AI conversations as Context Bundles",
    version: "0.0.1",
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    permissions: ["activeTab", "storage"],
    host_permissions: EXTENSION_HOST_PERMISSIONS,
    action: {
      default_title: "CtxPort",
    },
    commands: {
      "copy-current": {
        suggested_key: {
          default: "Ctrl+Shift+C",
          mac: "Command+Shift+C",
        },
        description: "Copy current conversation",
      },
      "toggle-batch": {
        suggested_key: {
          default: "Ctrl+Shift+E",
          mac: "Command+Shift+E",
        },
        description: "Toggle batch selection mode",
      },
    },
  },
  srcDir: "src",
  outDir: "dist",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [toUtf8(), tailwindcss(), tsconfigPaths()],
    resolve: {
      conditions: ["development", "import", "browser", "default"],
    },
    optimizeDeps: {
      exclude: ["@ctxport/core-plugins", "@ctxport/core-markdown"],
    },
    build: {
      sourcemap: false,
    },
  }),
});
