import type { Message } from "@ctxport/core-schema";

export type BundleFormatType = "full" | "user-only" | "code-only" | "compact";

export function filterMessages(
  messages: Message[],
  format: BundleFormatType,
): string[] {
  switch (format) {
    case "full":
      return formatFull(messages);
    case "user-only":
      return formatUserOnly(messages);
    case "code-only":
      return formatCodeOnly(messages);
    case "compact":
      return formatCompact(messages);
  }
}

function roleLabel(role: string): string {
  if (role === "user") return "User";
  if (role === "system") return "System";
  return "Assistant";
}

function formatFull(messages: Message[]): string[] {
  const parts: string[] = [];

  for (const msg of messages) {
    parts.push(`## ${roleLabel(msg.role)}\n\n${msg.contentMarkdown}`);
  }

  return parts;
}

function formatUserOnly(messages: Message[]): string[] {
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    parts.push(`## User\n\n${msg.contentMarkdown}`);
  }

  return parts;
}

function formatCodeOnly(messages: Message[]): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const parts: string[] = [];

  for (const msg of messages) {
    const matches = msg.contentMarkdown.match(codeBlockRegex);
    if (matches) {
      parts.push(`## ${roleLabel(msg.role)}\n\n${matches.join("\n\n")}`);
    }
  }

  return parts;
}

function formatCompact(messages: Message[]): string[] {
  const parts: string[] = [];

  for (const msg of messages) {
    let content = msg.contentMarkdown;

    // Remove comments inside code blocks
    content = content.replace(
      /(```\w*\n)([\s\S]*?)(```)/g,
      (_match, open: string, code: string, close: string) => {
        const cleaned = code
          .split("\n")
          .filter((line) => {
            const trimmed = line.trim();
            return (
              trimmed !== "" &&
              !trimmed.startsWith("//") &&
              !trimmed.startsWith("#") &&
              !trimmed.startsWith("/*") &&
              !trimmed.startsWith("*") &&
              !trimmed.startsWith("*/")
            );
          })
          .join("\n");
        return `${open}${cleaned}\n${close}`;
      },
    );

    // Collapse multiple blank lines to single
    content = content.replace(/\n{3,}/g, "\n\n");

    parts.push(`## ${roleLabel(msg.role)}\n\n${content}`);
  }

  return parts;
}
