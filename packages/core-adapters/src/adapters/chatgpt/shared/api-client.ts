import { createAppError } from "@ctxport/core-schema";
import type { MessageNode } from "./types";

const SESSION_ENDPOINT = "https://chatgpt.com/api/auth/session";
const API_ENDPOINT = "https://chatgpt.com/backend-api/conversation";
const TOKEN_EXPIRY_SKEW_MS = 60_000;
const DEFAULT_TOKEN_TTL_MS = 10 * 60_000;

class ChatGPTApiError extends Error {
  constructor(readonly status: number) {
    super(`ChatGPT API responded with ${status}`);
  }
}

export interface ChatGPTConversationResponse {
  conversation_id?: string;
  title?: string;
  mapping?: Record<string, MessageNode>;
  current_node?: string;
}

interface ChatGPTSessionResponse {
  accessToken?: string;
  expires?: string;
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

let accessTokenCache: AccessTokenCache | null = null;
let accessTokenPromise: Promise<string> | null = null;

export function extractChatGPTConversationId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    if (lastSegment?.length === 36) return lastSegment;

    const match = /\/c\/([a-zA-Z0-9-]{36})/.exec(parsed.pathname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchConversation(
  conversationId: string,
  accessToken: string,
): Promise<ChatGPTConversationResponse> {
  const response = await fetch(`${API_ENDPOINT}/${conversationId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ChatGPTApiError(response.status);
  }

  return (await response.json()) as ChatGPTConversationResponse;
}

function getTokenExpiresAt(session: ChatGPTSessionResponse): number {
  const parsed = Date.parse(session.expires ?? "");
  return Number.isFinite(parsed) ? parsed : Date.now() + DEFAULT_TOKEN_TTL_MS;
}

function hasValidAccessTokenCache(cache: AccessTokenCache | null): boolean {
  return Boolean(cache && cache.expiresAt - TOKEN_EXPIRY_SKEW_MS > Date.now());
}

function clearAccessTokenCache(): void {
  accessTokenCache = null;
}

async function fetchAndCacheAccessToken(): Promise<string> {
  const response = await fetch(SESSION_ENDPOINT, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw createAppError(
      "E-PARSE-005",
      `ChatGPT session API responded with ${response.status}`,
    );
  }

  const session = (await response.json()) as ChatGPTSessionResponse;
  if (!session.accessToken) {
    throw createAppError(
      "E-PARSE-005",
      "Cannot retrieve ChatGPT access token from session",
    );
  }

  accessTokenCache = {
    token: session.accessToken,
    expiresAt: getTokenExpiresAt(session),
  };

  return session.accessToken;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cache = accessTokenCache;
    if (cache && hasValidAccessTokenCache(cache)) {
      return cache.token;
    }
  }

  if (!accessTokenPromise) {
    accessTokenPromise = fetchAndCacheAccessToken().finally(() => {
      accessTokenPromise = null;
    });
  }

  return accessTokenPromise;
}

export async function fetchConversationWithTokenRetry(
  conversationId: string,
): Promise<ChatGPTConversationResponse> {
  const cachedToken = await getAccessToken();

  try {
    return await fetchConversation(conversationId, cachedToken);
  } catch (error) {
    if (!(error instanceof ChatGPTApiError) || error.status !== 401) {
      throw error;
    }

    clearAccessTokenCache();
    const freshToken = await getAccessToken(true);
    return fetchConversation(conversationId, freshToken);
  }
}
