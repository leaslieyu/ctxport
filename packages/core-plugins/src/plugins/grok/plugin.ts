import type { ContentBundle } from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import { createChatInjector } from "../shared/chat-injector";
import type { GrokDomMessage } from "./types";

const HOST_PATTERN = /^https:\/\/grok\.com\//i;
const CONVERSATION_PATTERN = /^https?:\/\/grok\.com\/chat\/([a-zA-Z0-9-]+)/;

export const grokPlugin: Plugin = {
  id: "grok",
  version: "1.0.0",
  name: "Grok",

  urls: {
    hosts: ["https://grok.com/*"],
    match: (url) => HOST_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const conversationId = extractConversationId(ctx.url);
    if (!conversationId) {
      throw createAppError("E-PARSE-001", "Not a Grok conversation page");
    }

    const messages = extractMessagesFromDom(ctx.document);
    if (messages.length === 0) {
      throw createAppError("E-PARSE-005", "No messages found in Grok conversation");
    }

    const title = extractTitle(ctx.document, messages);
    return buildBundle(messages, title, ctx.url);
  },

  injector: createChatInjector({
    platform: "grok",
    copyButtonSelectors: [
      'main header',
      '[class*="header"]',
    ],
    copyButtonPosition: "append",
    listItemLinkSelector: 'a[href^="/chat/"]',
    listItemIdPattern: /\/chat\/([a-zA-Z0-9-]+)$/,
    mainContentSelector: 'main, [class*="conversation"]',
    sidebarSelector: 'nav, [class*="sidebar"]',
  }),

  theme: {
    light: { primary: "#000000", secondary: "#eff3f4", fg: "#ffffff", secondaryFg: "#536471" },
    dark: { primary: "#ffffff", secondary: "#16181c", fg: "#000000", secondaryFg: "#71767b" },
  },
};

// --- Internal: URL parsing ---

function extractConversationId(url: string): string | null {
  const match = CONVERSATION_PATTERN.exec(url);
  return match?.[1] ?? null;
}

// --- Internal: DOM extraction ---

function extractMessagesFromDom(doc: Document): GrokDomMessage[] {
  const bubbles = doc.querySelectorAll<HTMLElement>("div.message-bubble");
  if (bubbles.length === 0) return [];

  const messages: GrokDomMessage[] = [];

  for (let i = 0; i < bubbles.length; i++) {
    const bubble = bubbles.item(i);
    if (!bubble) continue;
    const text = extractTextFromBubble(bubble);
    if (!text) continue;

    // Grok alternates: even indices = user, odd indices = assistant
    const role: "user" | "assistant" = i % 2 === 0 ? "user" : "assistant";
    messages.push({ role, text });
  }

  return messages;
}

function extractTextFromBubble(bubble: HTMLElement): string {
  // Handle code blocks: div.not-prose contains code
  const codeBlocks = bubble.querySelectorAll<HTMLElement>("div.not-prose");
  if (codeBlocks.length > 0) {
    return extractWithCodeBlocks(bubble, codeBlocks);
  }

  return bubble.innerText?.trim() ?? "";
}

function extractWithCodeBlocks(
  bubble: HTMLElement,
  codeBlocks: NodeListOf<HTMLElement>,
): string {
  // Clone the bubble to manipulate without affecting the DOM
  const clone = bubble.cloneNode(true) as HTMLElement;
  const clonedCodeBlocks = clone.querySelectorAll<HTMLElement>("div.not-prose");

  // Replace code blocks with markdown-formatted code
  for (const block of clonedCodeBlocks) {
    const langEl = block.querySelector<HTMLElement>("div > div > span");
    const codeEl = block.querySelector<HTMLElement>("div > div:nth-child(3) > code") ??
                   block.querySelector<HTMLElement>("code");
    const language = langEl?.innerText?.trim() ?? "";
    const code = codeEl?.innerText?.trim() ?? block.innerText?.trim() ?? "";

    const replacement = document.createElement("pre");
    replacement.textContent = `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    block.parentNode?.replaceChild(replacement, block);
  }

  return clone.innerText?.trim() ?? "";
}

// --- Internal: Title extraction ---

function extractTitle(doc: Document, messages: GrokDomMessage[]): string {
  // Try to get title from the page
  const titleEl = doc.querySelector<HTMLElement>("title");
  const pageTitle = titleEl?.textContent?.trim();
  if (pageTitle && pageTitle !== "Grok" && !pageTitle.startsWith("Grok -")) {
    return pageTitle;
  }

  // Fallback: first user message truncated to 50 chars
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (firstUserMsg) {
    const text = firstUserMsg.text;
    return text.length > 50 ? `${text.slice(0, 50)}...` : text;
  }

  return "Grok Conversation";
}

// --- Internal: Build ContentBundle ---

function buildBundle(
  messages: GrokDomMessage[],
  title: string,
  url: string,
): ContentBundle {
  const nodes: ContentBundle["nodes"] = messages.map((msg, index) => ({
    id: generateId(),
    participantId: msg.role === "user" ? "user" : "assistant",
    content: msg.text,
    order: index,
    type: "message",
  }));

  return {
    id: generateId(),
    title,
    participants: [
      { id: "user", name: "User", role: "user" },
      { id: "assistant", name: "Grok", role: "assistant" },
    ],
    nodes,
    source: {
      platform: "grok",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "grok",
      pluginVersion: "1.0.0",
    },
  };
}
