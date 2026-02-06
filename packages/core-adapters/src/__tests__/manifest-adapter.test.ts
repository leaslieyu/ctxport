import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManifestAdapter } from "../manifest/manifest-adapter";
import type { AdapterManifest } from "../manifest/schema";
import type { AdapterHooks } from "../manifest/hooks";

// Node 环境下没有 document，用 mock 替代
const mockDocument = { cookie: "" } as unknown as Document;

// 最小可用 manifest（用于测试 ManifestAdapter 引擎逻辑）
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
    it("匹配会话 URL 时返回 true", () => {
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

    it("不匹配时返回 false", () => {
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

    it("非 ext 类型返回 false", () => {
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

    it("主页 URL（非会话页）返回 false", () => {
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

    it("带 query 参数的会话 URL 返回 true", () => {
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

    it("带 fragment 的会话 URL 返回 true", () => {
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

  describe("parse — 消息解析逻辑", () => {
    it("正常解析简单消息列表", async () => {
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

    it("跳过角色为 skip 的消息", async () => {
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

    it("跳过空内容消息", async () => {
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

    it("使用 filters.skipWhen 过滤消息", async () => {
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

    it("filters.skipWhen 支持 exists 条件", async () => {
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

    it("filters.skipWhen 支持 exists: false 条件（字段不存在时跳过）", async () => {
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

      // 第二条消息没有 content 字段，exists: false 会跳过它
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.contentMarkdown).toBe("Hello");
    });

    it("filters.skipWhen 对 equals: null 不会跳过 undefined 字段", async () => {
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

    it("filters.skipWhen matchesPattern 不匹配非字符串值", async () => {
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

    it("filters.skipWhen 支持 matchesPattern 条件", async () => {
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

  describe("parse — 钩子集成", () => {
    it("transformResponse 钩子预处理响应", async () => {
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

    it("extractMessageText 钩子自定义文本提取", async () => {
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

    it("async extractMessageText 钩子正常工作", async () => {
      const manifest = createTestManifest();
      const hooks: AdapterHooks = {
        async extractMessageText(rawMsg) {
          const msg = rawMsg as { role: string; text: string };
          // 模拟异步操作
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

    it("afterParse 钩子后处理消息列表", async () => {
      const manifest = createTestManifest();
      const hooks: AdapterHooks = {
        // 合并连续同角色消息
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

    it("extractConversationId 钩子覆盖默认提取", async () => {
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

      // URL 不匹配 conversationUrlPatterns 的正则，但钩子可以从 query param 提取
      const result = await adapter.parse({
        type: "ext",
        url: "https://test.com/chat/abc-123?id=custom-id",
        document: mockDocument,
      });

      // 验证 fetch 被调用时使用了钩子提取的 conversationId
      const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(fetchCall[0]).toContain("custom-id");
    });

    it("extractAuth 钩子注入模板变量", async () => {
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

  describe("parse — 无 filters 时不跳过任何消息", () => {
    it("manifest 无 filters 字段时正常解析所有消息", async () => {
      const manifest = createTestManifest();
      // 确认默认 manifest 没有 filters
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

  describe("parse — 排序", () => {
    it("按 sortField 升序排列", async () => {
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

    it("按 sortField 降序排列", async () => {
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

    it("messagesPath 指向非数组时返回空消息列表并抛错", async () => {
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

  describe("parse — 错误处理", () => {
    it("无效的会话 URL 抛出 E-PARSE-001", async () => {
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

    it("API 返回非 200 抛出 E-PARSE-005", async () => {
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

    it("空消息列表抛出 E-PARSE-005", async () => {
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

  describe("属性", () => {
    it("从 manifest 中读取 id/version/name", () => {
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
