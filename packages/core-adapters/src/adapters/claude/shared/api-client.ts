import type { ClaudeConversationResponse } from "./types";

const API_BASE = "https://claude.ai/api/organizations";

export function extractClaudeConversationId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = /^\/chat\/([a-zA-Z0-9-]+)$/.exec(parsed.pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractClaudeOrgId(cookie: string): string | null {
  const match = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(cookie);
  if (!match?.[1]) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

export async function fetchClaudeConversation(
  orgId: string,
  conversationId: string,
): Promise<ClaudeConversationResponse> {
  const response = await fetch(
    `${API_BASE}/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      referrer: `https://claude.ai/chat/${conversationId}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      mode: "cors",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error(`Claude API responded with ${response.status}`);
  }

  return (await response.json()) as ClaudeConversationResponse;
}
