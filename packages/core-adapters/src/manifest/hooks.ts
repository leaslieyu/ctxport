import type { RawMessage } from "../base";

/**
 * Runtime context for hook functions.
 * Injected by the framework; hooks have read-only access.
 */
export interface HookContext {
  /** Current page URL */
  url: string;
  /** Current page document object (only available in ext mode) */
  document: Document;
  /** Conversation ID extracted from manifest.urls */
  conversationId: string;
  /** Provider declared in the manifest */
  provider: string;
}

/**
 * Adapter lifecycle hooks.
 * All hooks are optional pure functions (or async pure functions).
 */
export interface AdapterHooks {
  // --- Auth phase ---

  /**
   * Extract auth info from the browser environment (e.g., orgId from cookies).
   * Returns key-value pairs that are injected into URL templates and request headers.
   */
  extractAuth?: (ctx: HookContext) => Record<string, string> | null;

  /**
   * Extract auth info in environments without a full HookContext (list-copy-icon, batch-mode).
   * Runs in the content script and can access document.cookie without a full HookContext.
   * If not defined, fetchById will construct a minimal HookContext from globalThis.document and call extractAuth.
   */
  extractAuthHeadless?: () => Promise<Record<string, string>> | Record<string, string>;

  // --- Request phase ---

  /**
   * Custom conversation ID extraction logic.
   * Default behavior: extract from URL using regex.
   */
  extractConversationId?: (url: string) => string | null;

  /**
   * Custom request URL builder.
   * Returns a fully-formed URL string.
   */
  buildRequestUrl?: (
    ctx: HookContext & { templateVars: Record<string, string> },
  ) => string;

  // --- Response phase ---

  /**
   * Pre-process the API response before standard parsing.
   * Used for response structure normalization (e.g., ChatGPT mapping -> linear).
   */
  transformResponse?: (
    raw: unknown,
    ctx: HookContext,
  ) => { data: unknown; title?: string };

  /**
   * Custom text extraction for a single message (supports async).
   * Used when message content structure is complex (e.g., ChatGPT's parts array).
   */
  extractMessageText?: (
    rawMessage: unknown,
    ctx: HookContext,
  ) => string | Promise<string>;

  /**
   * Post-process the message list after standard parsing.
   * Used for merging consecutive same-role messages, deduplication, etc.
   */
  afterParse?: (messages: RawMessage[], ctx: HookContext) => RawMessage[];
}
