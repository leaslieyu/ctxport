import { useState, useCallback } from "react";
import {
  registerBuiltinAdapters,
  buildConversation,
  type RawMessage,
} from "@ctxport/core-adapters";
import {
  fetchConversationWithTokenRetry,
} from "@ctxport/core-adapters/adapters/chatgpt/shared/api-client";
import {
  fetchClaudeConversation,
  extractClaudeOrgId,
} from "@ctxport/core-adapters/adapters/claude/shared/api-client";
import { convertShareDataToMessages } from "@ctxport/core-adapters/adapters/chatgpt/shared/message-converter";
import { convertClaudeMessagesToRawMessages } from "@ctxport/core-adapters/adapters/claude/shared/message-converter";
import {
  serializeBundle,
  type BundleFormatType,
} from "@ctxport/core-markdown";
import type { Conversation } from "@ctxport/core-schema";
import { writeToClipboard } from "~/lib/utils";

export type BatchState = "normal" | "selecting" | "copying" | "success" | "partial-fail";

export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  messageCount: number;
  estimatedTokens: number;
}

export function useBatchMode() {
  const [state, setState] = useState<BatchState>("normal");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BatchResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const toggleBatchMode = useCallback(() => {
    setState((prev) => {
      if (prev === "normal") return "selecting";
      setSelected(new Set());
      setResult(null);
      return "normal";
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const copySelected = useCallback(
    async (format: BundleFormatType = "full") => {
      if (selected.size === 0) return;

      setState("copying");
      const ids = Array.from(selected);
      setProgress({ current: 0, total: ids.length });

      const conversations: Conversation[] = [];
      let failed = 0;

      // Determine platform from current URL
      const url = window.location.href;
      const isChatGPT = /chatgpt\.com|chat\.openai\.com/.test(url);

      for (let i = 0; i < ids.length; i++) {
        try {
          let conv: Conversation;

          if (isChatGPT) {
            conv = await fetchChatGPTConversation(ids[i]!);
          } else {
            conv = await fetchClaudeConversationById(ids[i]!);
          }

          conversations.push(conv);
        } catch {
          failed++;
        }

        setProgress({ current: i + 1, total: ids.length });
      }

      if (conversations.length > 0) {
        const serialized = serializeBundle(conversations, { format });
        await writeToClipboard(serialized.markdown);

        setResult({
          total: ids.length,
          succeeded: conversations.length,
          failed,
          messageCount: serialized.messageCount,
          estimatedTokens: serialized.estimatedTokens,
        });
      }

      setState(failed > 0 ? "partial-fail" : "success");

      if (failed === 0) {
        setTimeout(() => {
          setState("normal");
          setSelected(new Set());
          setResult(null);
        }, 2000);
      }
    },
    [selected],
  );

  return {
    state,
    selected,
    result,
    progress,
    toggleBatchMode,
    toggleSelection,
    selectAll,
    clearSelection,
    copySelected,
  };
}

async function fetchChatGPTConversation(conversationId: string): Promise<Conversation> {
  const data = await fetchConversationWithTokenRetry(conversationId);

  if (!data.mapping) {
    throw new Error("No conversation mapping found");
  }

  // Build linear conversation
  const ids: string[] = [];
  if (data.current_node && data.mapping[data.current_node]) {
    let nodeId: string | undefined = data.current_node;
    const visited = new Set<string>();
    while (nodeId && !visited.has(nodeId)) {
      visited.add(nodeId);
      ids.push(nodeId);
      nodeId = data.mapping[nodeId]?.parent;
    }
    ids.reverse();
  } else {
    const nodes = Object.values(data.mapping)
      .filter((n) => Boolean(n?.id))
      .sort((a, b) => (a.message?.create_time ?? 0) - (b.message?.create_time ?? 0));
    ids.push(...nodes.map((n) => n.id!));
  }

  const rawMessages = await convertShareDataToMessages(
    {
      mapping: data.mapping,
      linear_conversation: ids.map((id) => ({ id })),
    },
    data.conversation_id ?? conversationId,
    undefined,
  );

  return buildConversation(rawMessages, {
    sourceType: "extension-list",
    provider: "chatgpt",
    adapterId: "chatgpt-ext",
    adapterVersion: "1.0.0",
    title: data.title,
    url: `https://chatgpt.com/c/${conversationId}`,
  });
}

async function fetchClaudeConversationById(conversationId: string): Promise<Conversation> {
  const cookie = document.cookie;
  const orgId = extractClaudeOrgId(cookie);
  if (!orgId) {
    throw new Error("Cannot find Claude org ID");
  }

  const data = await fetchClaudeConversation(orgId, conversationId);
  const rawMessages = convertClaudeMessagesToRawMessages(data.chat_messages ?? []);

  return buildConversation(rawMessages, {
    sourceType: "extension-list",
    provider: "claude",
    adapterId: "claude-ext",
    adapterVersion: "1.0.0",
    title: data.name,
    url: `https://claude.ai/chat/${conversationId}`,
  });
}
