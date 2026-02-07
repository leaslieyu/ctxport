import type { AdapterManifest } from "../../manifest/schema";
import type { AdapterHooks } from "../../manifest/hooks";
import { extractClaudeMessageText } from "./shared/message-converter";
import type { ClaudeMessage } from "./shared/types";

// --- Declaration layer ---

export const claudeManifest = {
  id: "claude-ext",
  version: "2.0.0",
  name: "Claude Extension Parser",
  provider: "claude",

  urls: {
    hostPermissions: ["https://claude.ai/*"],
    hostPatterns: [/^https:\/\/claude\.ai\//i],
    conversationUrlPatterns: [
      /^https?:\/\/claude\.ai\/chat\/([a-zA-Z0-9-]+)/,
    ],
  },

  auth: {
    method: "cookie-session" as const,
  },

  endpoint: {
    urlTemplate:
      "https://claude.ai/api/organizations/{orgId}/chat_conversations/{conversationId}",
    method: "GET" as const,
    queryParams: {
      tree: "True",
      rendering_mode: "messages",
      render_all_tools: "true",
    },
    credentials: "include" as const,
    cache: "no-store" as const,
    referrerTemplate: "https://claude.ai/chat/{conversationId}",
  },

  parsing: {
    role: {
      field: "sender",
      mapping: {
        human: "user" as const,
        assistant: "assistant" as const,
      },
    },
    content: {
      messagesPath: "chat_messages",
      textPath: "_extractedText", // Processed by extractMessageText hook
      titlePath: "name",
      sortField: "created_at",
      sortOrder: "asc" as const,
    },
  },

  injection: {
    copyButton: {
      selectors: [
        "header .flex.items-center.gap-1",
        "header .flex.items-center.gap-2",
        '[class*="sticky"] .flex.items-center',
        'div[class*="conversation"] header .flex',
      ],
      position: "prepend" as const,
    },
    listItem: {
      linkSelector: 'a[href^="/chat/"]',
      idPattern: /\/chat\/([a-zA-Z0-9-]+)$/,
      containerSelector: '[class*="sidebar"], nav',
    },
    mainContentSelector: 'main, [class*="conversation"]',
    sidebarSelector: '[class*="sidebar"], nav',
  },

  theme: {
    light: {
      primary: "#c6613f",
      secondary: "#ffedd5",
      primaryForeground: "#ffffff",
      secondaryForeground: "#9a3412",
    },
    dark: {
      primary: "#c6613f",
      secondary: "#7c2d12",
      primaryForeground: "#431407",
      secondaryForeground: "#ffedd5",
    },
  },

  conversationUrlTemplate: "https://claude.ai/chat/{conversationId}",

  meta: {
    reliability: "high" as const,
    coverage: "All Claude conversation types (including Opus, Sonnet, Haiku)",
    lastVerified: "2026-02-07",
    knownLimitations: [
      "Requires extracting orgId from cookies",
      "Artifact tags are converted to code blocks",
    ],
  },
} satisfies AdapterManifest;

// --- Hooks layer ---

export const claudeHooks: AdapterHooks = {
  /**
   * Claude stores auth info in the lastActiveOrg cookie.
   */
  extractAuth(ctx) {
    const cookie = ctx.document?.cookie ?? "";
    const match = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(cookie);
    if (!match?.[1]) return null;
    return { orgId: decodeURIComponent(match[1]) };
  },

  /**
   * Headless version: reads orgId directly from document.cookie without requiring HookContext.
   */
  extractAuthHeadless(): Record<string, string> {
    const cookie = document.cookie;
    const match = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(cookie);
    if (!match?.[1]) return {};
    return { orgId: decodeURIComponent(match[1]) };
  },

  /**
   * Claude message content needs to be extracted from the content array and artifact tags processed.
   */
  extractMessageText(rawMessage: unknown) {
    return extractClaudeMessageText(rawMessage as ClaudeMessage);
  },

  /**
   * Merge consecutive messages with the same role (Claude may split a single reply into multiple messages).
   */
  afterParse(messages) {
    const merged: typeof messages = [];
    for (const msg of messages) {
      const last = merged[merged.length - 1];
      if (last?.role === msg.role) {
        last.content = `${last.content}\n${msg.content}`.trim();
      } else {
        merged.push({ ...msg });
      }
    }
    return merged;
  },
};
