import { describe, it, expect } from "vitest";
import { serializeConversation, serializeBundle } from "../serializer";
import type { Conversation } from "@ctxport/core-schema";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    sourceType: "extension-current",
    title: "Test Conversation",
    messages: [
      {
        id: "00000000-0000-0000-0000-000000000010",
        role: "user",
        contentMarkdown: "Hello, how are you?",
        order: 0,
      },
      {
        id: "00000000-0000-0000-0000-000000000011",
        role: "assistant",
        contentMarkdown: "I'm doing well! Here's some code:\n\n```python\nprint('hello')\n```",
        order: 1,
      },
    ],
    sourceMeta: {
      provider: "chatgpt",
      url: "https://chatgpt.com/c/abc123",
      parsedAt: "2026-02-07T14:30:00.000Z",
      adapterId: "chatgpt-ext",
      adapterVersion: "1.0.0",
    },
    createdAt: "2026-02-07T14:30:00.000Z",
    updatedAt: "2026-02-07T14:30:00.000Z",
    ...overrides,
  } as Conversation;
}

describe("serializeConversation", () => {
  it("should serialize with frontmatter by default", () => {
    const conv = makeConversation();
    const result = serializeConversation(conv);

    expect(result.markdown).toContain("---");
    expect(result.markdown).toContain("ctxport: v1");
    expect(result.markdown).toContain("source: chatgpt");
    expect(result.markdown).toContain("title: Test Conversation");
    expect(result.markdown).toContain("## User");
    expect(result.markdown).toContain("## Assistant");
    expect(result.messageCount).toBe(2);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it("should serialize without frontmatter when disabled", () => {
    const conv = makeConversation();
    const result = serializeConversation(conv, { includeFrontmatter: false });

    expect(result.markdown).not.toContain("---\nctxport");
    expect(result.markdown).toContain("## User");
  });

  it("should handle user-only format", () => {
    const conv = makeConversation();
    const result = serializeConversation(conv, { format: "user-only" });

    expect(result.markdown).toContain("## User");
    expect(result.markdown).not.toContain("## Assistant");
  });

  it("should handle code-only format", () => {
    const conv = makeConversation();
    const result = serializeConversation(conv, { format: "code-only" });

    expect(result.markdown).toContain("```python");
    expect(result.markdown).not.toContain("Hello, how are you?");
  });

  it("should handle empty messages", () => {
    const conv = makeConversation({ messages: [] });
    const result = serializeConversation(conv);

    expect(result.messageCount).toBe(0);
    expect(result.estimatedTokens).toBe(0);
  });

  it("should escape title with special characters in frontmatter", () => {
    const conv = makeConversation({ title: 'Discussing "REST API": auth' });
    const result = serializeConversation(conv);

    expect(result.markdown).toContain('title: "Discussing \\"REST API\\": auth"');
  });

  it("should handle system role messages", () => {
    const conv = makeConversation({
      messages: [
        {
          id: "00000000-0000-0000-0000-000000000010",
          role: "system",
          contentMarkdown: "You are a helpful assistant.",
          order: 0,
        },
        {
          id: "00000000-0000-0000-0000-000000000011",
          role: "user",
          contentMarkdown: "Hello",
          order: 1,
        },
      ],
    });
    const result = serializeConversation(conv);

    expect(result.markdown).toContain("## System");
    expect(result.markdown).toContain("## User");
  });

  it("should handle conversation without sourceMeta", () => {
    const conv = makeConversation({ sourceMeta: undefined });
    const result = serializeConversation(conv);

    expect(result.markdown).toContain("ctxport: v1");
    expect(result.markdown).not.toContain("source:");
    expect(result.markdown).not.toContain("url:");
  });

  it("should preserve code blocks with nested backticks", () => {
    const conv = makeConversation({
      messages: [
        {
          id: "00000000-0000-0000-0000-000000000010",
          role: "assistant",
          contentMarkdown: "Here is markdown:\n\n````md\n```python\nprint('hi')\n```\n````",
          order: 0,
        },
      ],
    });
    const result = serializeConversation(conv);

    expect(result.markdown).toContain("````md");
    expect(result.markdown).toContain("```python");
  });
});

describe("serializeBundle", () => {
  it("should merge multiple conversations", () => {
    const conv1 = makeConversation({ title: "First Chat" });
    const conv2 = makeConversation({
      id: "00000000-0000-0000-0000-000000000002",
      title: "Second Chat",
      sourceMeta: {
        provider: "claude",
        url: "https://claude.ai/chat/def456",
        parsedAt: "2026-02-07T14:30:00.000Z",
        adapterId: "claude-ext",
        adapterVersion: "1.0.0",
      },
    });

    const result = serializeBundle([conv1, conv2]);

    expect(result.markdown).toContain("bundle: merged");
    expect(result.markdown).toContain("conversations: 2");
    expect(result.markdown).toContain("# [1/2] First Chat");
    expect(result.markdown).toContain("# [2/2] Second Chat");
    expect(result.markdown).toContain("---");
    expect(result.messageCount).toBe(4);
  });

  it("should handle single conversation bundle", () => {
    const conv = makeConversation({ title: "Solo Chat" });
    const result = serializeBundle([conv]);

    expect(result.markdown).toContain("bundle: merged");
    expect(result.markdown).toContain("conversations: 1");
    expect(result.markdown).toContain("# [1/1] Solo Chat");
  });

  it("should handle conversations without titles using Untitled", () => {
    const conv = makeConversation({ title: undefined });
    const result = serializeBundle([conv]);

    expect(result.markdown).toContain("# [1/1] Untitled");
  });
});
