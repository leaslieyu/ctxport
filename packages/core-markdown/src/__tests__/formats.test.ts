import { describe, it, expect } from "vitest";
import { filterMessages } from "../formats";
import type { Message } from "@ctxport/core-schema";

function makeMessages(): Message[] {
  return [
    {
      id: "00000000-0000-0000-0000-000000000010",
      role: "user",
      contentMarkdown: "What is recursion?",
      order: 0,
    },
    {
      id: "00000000-0000-0000-0000-000000000011",
      role: "assistant",
      contentMarkdown:
        "Recursion is when a function calls itself.\n\n```python\n# A simple example\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n```\n\nThis computes n!",
      order: 1,
    },
  ] as Message[];
}

describe("filterMessages", () => {
  it("full format includes all messages with role headers", () => {
    const parts = filterMessages(makeMessages(), "full");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("## User");
    expect(parts[1]).toContain("## Assistant");
  });

  it("user-only format includes only user messages", () => {
    const parts = filterMessages(makeMessages(), "user-only");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toContain("## User");
    expect(parts[0]).toContain("What is recursion?");
  });

  it("code-only format extracts only code blocks", () => {
    const parts = filterMessages(makeMessages(), "code-only");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toContain("```python");
    expect(parts[0]).not.toContain("This computes n!");
    expect(parts[0]).not.toContain("What is recursion?");
  });

  it("compact format removes comments and collapses blanks", () => {
    const parts = filterMessages(makeMessages(), "compact");
    expect(parts).toHaveLength(2);
    // The comment line "# A simple example" should be removed
    expect(parts[1]).not.toContain("# A simple example");
    expect(parts[1]).toContain("def factorial");
  });

  it("code-only returns empty array for messages without code blocks", () => {
    const messages = [
      {
        id: "00000000-0000-0000-0000-000000000010",
        role: "user" as const,
        contentMarkdown: "Tell me about recursion.",
        order: 0,
      },
    ];
    const parts = filterMessages(messages, "code-only");
    expect(parts).toHaveLength(0);
  });

  it("user-only skips assistant messages", () => {
    const parts = filterMessages(makeMessages(), "user-only");
    expect(parts).toHaveLength(1);
    expect(parts[0]).not.toContain("Recursion is when");
  });

  it("full format handles system role messages", () => {
    const messages = [
      {
        id: "00000000-0000-0000-0000-000000000010",
        role: "system" as const,
        contentMarkdown: "You are a helpful assistant.",
        order: 0,
      },
      ...makeMessages(),
    ];
    const parts = filterMessages(messages, "full");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toContain("## System");
  });
});
