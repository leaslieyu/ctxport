import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManifestAdapter } from "../manifest/manifest-adapter";
import type { AdapterManifest } from "../manifest/schema";
import type { AdapterHooks } from "../manifest/hooks";

// No document in Node environment, use mock instead
const mockDocument = { cookie: "" } as unknown as Document;

// Minimal valid manifest (for testing ManifestAdapter engine logic)
function createTestManifest(
  overrides: Partial<AdapterManifest> = {},
): AdapterManifest {
  return {
    id: "test-ext",
    version: "1.0.0",
    name: "Test Adapter",
    provider: "chatgpt",

    urls: {
      hostPermissions: ["https://test.com/*"],
      hostPatterns: [/^https:\/\/test\.com\//i],
      conversationUrlPatterns: [
        /^https?:\/\/test\.com\/chat\/([a-zA-Z0-9-]+)/,
      ],
    },

    auth: {
      method: "cookie-session",
    },

    endpoint: {
      urlTemplate: "https://test.com/api/conversations/{conversationId}",
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },

    parsing: {
      role: {
        field: "role",
        mapping: {
          user: "user",
          assistant: "assistant",
          system: "skip",
        },
      },
      content: {
        messagesPath: "messages",
        textPath: "text",
        titlePath: "title",
      },
    },

    injection: {
      copyButton: {
        selectors: ["header .actions"],
        position: "prepend",
      },
      listItem: {
        linkSelector: 'a[href^="/chat/"]',
        idPattern: /\/chat\/([a-zA-Z0-9-]+)$/,
      },
    },

    theme: {
      light: {
        primary: "#000",
        secondary: "#666",
        primaryForeground: "#fff",
        secondaryForeground: "#fff",
      },
    },

    ...overrides,
  } as AdapterManifest;
}

describe("ManifestAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("canHandle", () => {
    it("returns true when URL matches a conversation pattern", () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);
      expect(
        adapter.canHandle({
          type: "ext",
          url: "https://test.com/chat/abc-123",
          document: mockDocument,
        }),
      ).toBe(true);
    });

    it("returns false when URL does not match", () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);
      expect(
        adapter.canHandle({
          type: "ext",
          url: "https://other.com/chat/abc",
          document: mockDocument,
        }),
      ).toBe(false);
    });

    it("returns false for non-ext type", () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);
      expect(
        adapter.canHandle({
          type: "ext" as never,
          url: "https://test.com/chat/abc",
          document: undefined as never,
        }),
      ).toBe(true);
    });

    it("returns false for home page URL (not a conversation page)", () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);
      expect(
        adapter.canHandle({
          type: "ext",
          url: "https://test.com/",
          document: mockDocument,
        }),
      ).toBe(false);
    });

    it("returns true for conversation URL with query parameters", () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);
      expect(
        adapter.canHandle({
          type: "ext",
          url: "https://test.com/chat/abc-123?share=true",
          document: mockDocument,
        }),
      ).toBe(true);
    });

    it("returns true for conversation URL with fragment", () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);
      expect(
        adapter.canHandle({
          type: "ext",
          url: "https://test.com/chat/abc-123#section",
          document: mockDocument,
        }),
      ).toBe(true);
    });
  });

  describe("parse — message parsing logic", () => {
    it("parses a simple message list correctly", async () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test Conversation",
        messages: [
          { role: "user", text: "Hello" },
          { role: "assistant", text: "Hi there!" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-001",
        document: mockDocument,
      });

      expect(result.title).toBe("Test Conversation");
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]!.role).toBe("user");
      expect(result.messages[0]!.contentMarkdown).toBe("Hello");
      expect(result.messages[1]!.role).toBe("assistant");
      expect(result.messages[1]!.contentMarkdown).toBe("Hi there!");
    });

    it("skips messages with role mapped to skip", async () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "system", text: "You are a bot" },
          { role: "user", text: "Hello" },
          { role: "assistant", text: "Hi!" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-002",
        document: mockDocument,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]!.role).toBe("user");
    });

    it("skips messages with empty content", async () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "" },
          { role: "user", text: "   " },
          { role: "assistant", text: "Hi!" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-003",
        document: mockDocument,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.role).toBe("assistant");
    });

    it("filters messages using filters.skipWhen", async () => {
      const manifest = createTestManifest({
        filters: {
          skipWhen: [{ field: "hidden", equals: true }],
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "Hello", hidden: false },
          { role: "assistant", text: "Secret", hidden: true },
          { role: "assistant", text: "Visible" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-004",
        document: mockDocument,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]!.contentMarkdown).toBe("Visible");
    });

    it("filters.skipWhen supports exists condition", async () => {
      const manifest = createTestManifest({
        filters: {
          skipWhen: [{ field: "metadata.deleted", exists: true }],
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "Hello" },
          { role: "assistant", text: "Deleted", metadata: { deleted: "yes" } },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-005",
        document: mockDocument,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.contentMarkdown).toBe("Hello");
    });

    it("filters.skipWhen supports exists: false (skip when field is absent)", async () => {
      const manifest = createTestManifest({
        filters: {
          skipWhen: [{ field: "content", exists: false }],
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "Hello", content: "has content" },
          { role: "assistant", text: "No content field" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-exists-false",
        document: mockDocument,
      });

      // Second message has no content field, exists: false will skip it
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.contentMarkdown).toBe("Hello");
    });

    it("filters.skipWhen with equals: null does not skip undefined fields", async () => {
      const manifest = createTestManifest({
        filters: {
          skipWhen: [{ field: "status", equals: null }],
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "Hello", status: null },
          { role: "assistant", text: "No status" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-equals-null",
        document: mockDocument,
      });

      // status === null -> skipped, status === undefined -> NOT skipped (strict equality)
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.contentMarkdown).toBe("No status");
    });

    it("filters.skipWhen matchesPattern does not match non-string values", async () => {
      const manifest = createTestManifest({
        filters: {
          skipWhen: [{ field: "count", matchesPattern: "\\d+" }],
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "Hello", count: 42 },
          { role: "assistant", text: "World", count: "99" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-pattern-type",
        document: mockDocument,
      });

      // count=42 is number (not string), matchesPattern should NOT skip
      // count="99" is string, matchesPattern WILL skip
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.contentMarkdown).toBe("Hello");
    });

    it("filters.skipWhen supports matchesPattern condition", async () => {
      const manifest = createTestManifest({
        filters: {
          skipWhen: [{ field: "status", matchesPattern: ".+" }],
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "Hello" },
          { role: "assistant", text: "Thinking", status: "reasoning" },
          { role: "assistant", text: "Done" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-006",
        document: mockDocument,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]!.contentMarkdown).toBe("Hello");
      expect(result.messages[1]!.contentMarkdown).toBe("Done");
    });
  });

  describe("parse — hooks integration", () => {
    it("transformResponse hook preprocesses response", async () => {
      const manifest = createTestManifest();
      const hooks: AdapterHooks = {
        transformResponse(raw) {
          const data = raw as { items: unknown[]; name: string };
          return {
            data: { messages: data.items, title: data.name },
            title: data.name,
          };
        },
      };
      const adapter = new ManifestAdapter(manifest, hooks);

      const mockResponse = {
        name: "Transformed",
        items: [
          { role: "user", text: "Hello" },
          { role: "assistant", text: "World" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-007",
        document: mockDocument,
      });

      expect(result.title).toBe("Transformed");
      expect(result.messages).toHaveLength(2);
    });

    it("extractMessageText hook customizes text extraction", async () => {
      const manifest = createTestManifest();
      const hooks: AdapterHooks = {
        extractMessageText(rawMsg) {
          const msg = rawMsg as { role: string; parts: string[] };
          return msg.parts.join("\n");
        },
      };
      const adapter = new ManifestAdapter(manifest, hooks);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", parts: ["Hello", "World"] },
          { role: "assistant", parts: ["Hi", "there"] },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-008",
        document: mockDocument,
      });

      expect(result.messages[0]!.contentMarkdown).toBe("Hello\nWorld");
      expect(result.messages[1]!.contentMarkdown).toBe("Hi\nthere");
    });

    it("async extractMessageText hook works correctly", async () => {
      const manifest = createTestManifest();
      const hooks: AdapterHooks = {
        async extractMessageText(rawMsg) {
          const msg = rawMsg as { role: string; text: string };
          // Simulate async operation
          await new Promise((r) => setTimeout(r, 1));
          return `[processed] ${msg.text}`;
        },
      };
      const adapter = new ManifestAdapter(manifest, hooks);

      const mockResponse = {
        title: "Test",
        messages: [{ role: "user", text: "Hello" }],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-009",
        document: mockDocument,
      });

      expect(result.messages[0]!.contentMarkdown).toBe("[processed] Hello");
    });

    it("afterParse hook post-processes message list", async () => {
      const manifest = createTestManifest();
      const hooks: AdapterHooks = {
        // Merge consecutive messages with the same role
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
      const adapter = new ManifestAdapter(manifest, hooks);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "Hello" },
          { role: "assistant", text: "Part 1" },
          { role: "assistant", text: "Part 2" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-010",
        document: mockDocument,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]!.contentMarkdown).toBe("Part 1\nPart 2");
    });

    it("extractConversationId hook overrides default extraction", async () => {
      const manifest = createTestManifest();
      const hooks: AdapterHooks = {
        extractConversationId(url: string) {
          const parsed = new URL(url);
          return parsed.searchParams.get("id");
        },
      };
      const adapter = new ManifestAdapter(manifest, hooks);

      const mockResponse = {
        title: "Test",
        messages: [{ role: "user", text: "Hello" }],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      // URL doesn't match conversationUrlPatterns regex, but hook extracts from query param
      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/abc-123?id=custom-id",
        document: mockDocument,
      });

      // Verify fetch was called with the conversation ID extracted by the hook
      const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(fetchCall[0]).toContain("custom-id");
    });

    it("extractAuth hook injects template variables", async () => {
      const manifest = createTestManifest({
        endpoint: {
          urlTemplate:
            "https://test.com/api/{orgId}/conversations/{conversationId}",
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      });
      const hooks: AdapterHooks = {
        extractAuth() {
          return { orgId: "my-org-123" };
        },
      };
      const adapter = new ManifestAdapter(manifest, hooks);

      const mockResponse = {
        title: "Test",
        messages: [{ role: "user", text: "Hello" }],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-011",
        document: mockDocument,
      });

      const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(fetchCall[0]).toContain("my-org-123");
      expect(fetchCall[0]).toContain("conv-011");
    });
  });

  describe("parse — no filters does not skip any messages", () => {
    it("parses all messages when manifest has no filters field", async () => {
      const manifest = createTestManifest();
      // Confirm default manifest has no filters
      expect(manifest.filters).toBeUndefined();
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: [
          { role: "user", text: "A" },
          { role: "assistant", text: "B" },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-no-filter",
        document: mockDocument,
      });

      expect(result.messages).toHaveLength(2);
    });
  });

  describe("parse — sorting", () => {
    it("sorts by sortField in ascending order", async () => {
      const manifest = createTestManifest({
        parsing: {
          role: {
            field: "role",
            mapping: { user: "user", assistant: "assistant" },
          },
          content: {
            messagesPath: "messages",
            textPath: "text",
            sortField: "timestamp",
            sortOrder: "asc",
          },
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        messages: [
          { role: "assistant", text: "Second", timestamp: 2 },
          { role: "user", text: "First", timestamp: 1 },
          { role: "assistant", text: "Third", timestamp: 3 },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-012",
        document: mockDocument,
      });

      expect(result.messages[0]!.contentMarkdown).toBe("First");
      expect(result.messages[1]!.contentMarkdown).toBe("Second");
      expect(result.messages[2]!.contentMarkdown).toBe("Third");
    });

    it("sorts by sortField in descending order", async () => {
      const manifest = createTestManifest({
        parsing: {
          role: {
            field: "role",
            mapping: { user: "user", assistant: "assistant" },
          },
          content: {
            messagesPath: "messages",
            textPath: "text",
            sortField: "timestamp",
            sortOrder: "desc",
          },
        },
      });
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        messages: [
          { role: "user", text: "First", timestamp: 1 },
          { role: "assistant", text: "Third", timestamp: 3 },
          { role: "assistant", text: "Second", timestamp: 2 },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/conv-desc",
        document: mockDocument,
      });

      expect(result.messages[0]!.contentMarkdown).toBe("Third");
      expect(result.messages[1]!.contentMarkdown).toBe("Second");
      expect(result.messages[2]!.contentMarkdown).toBe("First");
    });

    it("throws E-PARSE-005 when messagesPath points to a non-array", async () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);

      const mockResponse = {
        title: "Test",
        messages: "not-an-array",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      await expect(
        adapter.parse({
          type: "ext",
          url: "https://test.com/chat/conv-not-array",
          document: mockDocument,
        }),
      ).rejects.toMatchObject({ code: "E-PARSE-005" });
    });
  });

  describe("parse — error handling", () => {
    it("throws E-PARSE-001 for invalid conversation URL", async () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);

      await expect(
        adapter.parse({
          type: "ext",
          url: "https://test.com/not-a-chat",
          document: mockDocument,
        }),
      ).rejects.toMatchObject({ code: "E-PARSE-001" });
    });

    it("throws E-PARSE-005 when API returns non-200", async () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        }),
      );

      await expect(
        adapter.parse({
          type: "ext",
          url: "https://test.com/chat/conv-err",
          document: mockDocument,
        }),
      ).rejects.toMatchObject({ code: "E-PARSE-005" });
    });

    it("throws E-PARSE-005 for empty message list", async () => {
      const manifest = createTestManifest();
      const adapter = new ManifestAdapter(manifest);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ title: "Empty", messages: [] }),
        }),
      );

      await expect(
        adapter.parse({
          type: "ext",
          url: "https://test.com/chat/conv-empty",
          document: mockDocument,
        }),
      ).rejects.toMatchObject({ code: "E-PARSE-005" });
    });
  });

  describe("properties", () => {
    it("reads id/version/name from manifest", () => {
      const manifest = createTestManifest({
        id: "my-adapter",
        version: "3.0.0",
        name: "My Adapter",
      });
      const adapter = new ManifestAdapter(manifest);

      expect(adapter.id).toBe("my-adapter");
      expect(adapter.version).toBe("3.0.0");
      expect(adapter.name).toBe("My Adapter");
      expect(adapter.supportedInputTypes).toEqual(["ext"]);
    });
  });
});
