import type { Conversation } from "@ctxport/core-schema";
import { filterMessages, type BundleFormatType } from "./formats";
import { estimateTokens, formatTokenCount } from "./token-estimator";

export interface SerializeOptions {
  format?: BundleFormatType;
  includeFrontmatter?: boolean;
}

export interface SerializeResult {
  markdown: string;
  messageCount: number;
  estimatedTokens: number;
}

function buildFrontmatter(meta: Record<string, string | number>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === "string") {
      // Quote strings that contain special chars
      if (value.includes(":") || value.includes('"') || value.includes("#")) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export function serializeConversation(
  conversation: Conversation,
  options: SerializeOptions = {},
): SerializeResult {
  const { format = "full", includeFrontmatter = true } = options;

  const messageParts = filterMessages(conversation.messages, format);
  const body = messageParts.join("\n\n");

  const messageCount = conversation.messages.length;
  const tokens = estimateTokens(body);

  const sections: string[] = [];

  if (includeFrontmatter) {
    const meta: Record<string, string | number> = {
      ctxport: "v1",
    };

    if (conversation.sourceMeta?.provider) {
      meta.source = conversation.sourceMeta.provider;
    }
    if (conversation.sourceMeta?.url) {
      meta.url = conversation.sourceMeta.url;
    }
    if (conversation.title) {
      meta.title = conversation.title;
    }
    meta.date = conversation.createdAt ?? new Date().toISOString();
    meta.messages = messageCount;
    meta.tokens = formatTokenCount(tokens);
    meta.format = format;

    sections.push(buildFrontmatter(meta));
  }

  sections.push(body);

  return {
    markdown: sections.join("\n\n"),
    messageCount,
    estimatedTokens: tokens,
  };
}

export function serializeBundle(
  conversations: Conversation[],
  options: SerializeOptions = {},
): SerializeResult {
  const { format = "full", includeFrontmatter = true } = options;

  const total = conversations.length;
  const allParts: string[] = [];
  let totalMessageCount = 0;

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i]!;
    const messageParts = filterMessages(conv.messages, format);
    const title = conv.title ?? "Untitled";
    const source = conv.sourceMeta?.provider ?? "unknown";
    const msgCount = conv.messages.length;
    const url = conv.sourceMeta?.url ?? "";

    totalMessageCount += msgCount;

    const header = `# [${i + 1}/${total}] ${title}`;
    const meta = `> Source: ${source} | Messages: ${msgCount}${url ? ` | URL: ${url}` : ""}`;

    allParts.push(`${header}\n\n${meta}\n\n${messageParts.join("\n\n")}`);
  }

  const body = allParts.join("\n\n---\n\n");
  const tokens = estimateTokens(body);

  const sections: string[] = [];

  if (includeFrontmatter) {
    const meta: Record<string, string | number> = {
      ctxport: "v1",
      bundle: "merged" as string,
      conversations: total,
      date: new Date().toISOString(),
      total_messages: totalMessageCount,
      total_tokens: formatTokenCount(tokens),
      format,
    };

    sections.push(buildFrontmatter(meta));
  }

  sections.push(body);

  return {
    markdown: sections.join("\n\n"),
    messageCount: totalMessageCount,
    estimatedTokens: tokens,
  };
}
