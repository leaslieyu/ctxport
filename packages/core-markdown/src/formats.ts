import type { ContentNode, Participant } from "@ctxport/core-schema";

export type BundleFormatType = "full" | "user-only" | "code-only" | "compact";

export function filterNodes(
  nodes: ContentNode[],
  participants: Participant[],
  format: BundleFormatType,
): string[] {
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const getRole = (node: ContentNode) =>
    participantMap.get(node.participantId)?.role ?? "assistant";

  switch (format) {
    case "full":
      return formatFull(nodes, getRole);
    case "user-only":
      return formatUserOnly(nodes, getRole);
    case "code-only":
      return formatCodeOnly(nodes, getRole);
    case "compact":
      return formatCompact(nodes, getRole);
  }
}

function roleLabel(role: string): string {
  if (role === "user") return "User";
  if (role === "system") return "System";
  return "Assistant";
}

function formatFull(
  nodes: ContentNode[],
  getRole: (node: ContentNode) => string,
): string[] {
  const parts: string[] = [];

  for (const node of nodes) {
    parts.push(`## ${roleLabel(getRole(node))}\n\n${node.content}`);
  }

  return parts;
}

function formatUserOnly(
  nodes: ContentNode[],
  getRole: (node: ContentNode) => string,
): string[] {
  const parts: string[] = [];

  for (const node of nodes) {
    if (getRole(node) !== "user") continue;
    parts.push(`## User\n\n${node.content}`);
  }

  return parts;
}

function formatCodeOnly(
  nodes: ContentNode[],
  getRole: (node: ContentNode) => string,
): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const parts: string[] = [];

  for (const node of nodes) {
    const matches = node.content.match(codeBlockRegex);
    if (matches) {
      parts.push(`## ${roleLabel(getRole(node))}\n\n${matches.join("\n\n")}`);
    }
  }

  return parts;
}

function formatCompact(
  nodes: ContentNode[],
  getRole: (node: ContentNode) => string,
): string[] {
  const parts: string[] = [];

  for (const node of nodes) {
    let content = node.content;

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

    parts.push(`## ${roleLabel(getRole(node))}\n\n${content}`);
  }

  return parts;
}
