// --- Platform identification ---

export interface UrlPatternConfig {
  /** Host page match patterns (used for content_scripts.matches) */
  hostPermissions: string[];
  /** Host page regexes (for runtime matching) */
  hostPatterns: RegExp[];
  /** Conversation page URL regexes */
  conversationUrlPatterns: RegExp[];
}

// --- Auth configuration ---

export type AuthMethod = "cookie-session" | "bearer-from-api" | "none";

export interface AuthConfig {
  method: AuthMethod;
  /** Session endpoint for bearer-from-api mode */
  sessionEndpoint?: string;
  /** JSON path to extract token from session response */
  tokenPath?: string;
  /** JSON path to extract expiration from session response */
  expiresPath?: string;
  /** Token cache TTL in milliseconds (default: 10 minutes) */
  tokenTtlMs?: number;
}

// --- Data fetching configuration ---

export interface ConversationEndpoint {
  /**
   * URL template with variable substitution:
   * - {conversationId} -- conversation ID extracted from URL
   * - {orgId} -- organization ID extracted from cookie/DOM (optional)
   */
  urlTemplate: string;
  method: "GET" | "POST";
  /** Additional request headers */
  headers?: Record<string, string>;
  /** Query parameter templates */
  queryParams?: Record<string, string>;
  /** POST body template */
  bodyTemplate?: unknown;
  /** Request credentials option */
  credentials: "include" | "omit" | "same-origin";
  cache: "default" | "no-store" | "no-cache" | "reload";
  referrerTemplate?: string;
}

// --- Message parsing rules ---

export interface RoleMapping {
  /** Field path to read the role from raw data */
  field: string;
  /** Role value mapping: raw value -> "user" | "assistant" | "skip" */
  mapping: Record<string, "user" | "assistant" | "skip">;
}

export interface ContentExtraction {
  /** JSON path to the messages array (dot-separated) */
  messagesPath: string;
  /** JSON path to the sort field (relative to a single message) */
  sortField?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** JSON path to the text content (relative to a single message) */
  textPath: string;
  /** JSON path to the title (relative to the top-level response) */
  titlePath?: string;
}

export interface MessageParseConfig {
  role: RoleMapping;
  content: ContentExtraction;
}

// --- UI injection configuration ---

export interface SelectorFallbacks {
  /** Priority-ordered list of CSS selectors; stops at the first match */
  selectors: string[];
  /** Injection position */
  position: "prepend" | "append" | "before" | "after";
}

export interface ListItemConfig {
  /** CSS selector for list item links */
  linkSelector: string;
  /** Regex to extract conversation ID from href (first capture group) */
  idPattern: RegExp;
  /** List container selector (MutationObserver target) */
  containerSelector?: string;
}

export interface InjectionConfig {
  /** Copy button placement in the conversation header bar */
  copyButton: SelectorFallbacks;
  /** Sidebar list configuration */
  listItem: ListItemConfig;
  /** Main content area selector (for observing copy button injection timing) */
  mainContentSelector?: string;
  /** Sidebar selector (for observing list item injection timing) */
  sidebarSelector?: string;
}

// --- Theme configuration ---

export interface ThemeTokens {
  primary: string;
  secondary: string;
  primaryForeground: string;
  secondaryForeground: string;
}

export interface ThemeConfig {
  light: ThemeTokens;
  dark?: ThemeTokens;
}

// --- Skip/filter rules ---

export interface SkipRule {
  field: string;
  equals?: unknown;
  exists?: boolean;
  matchesPattern?: string;
}

export interface MessageFilter {
  /** Conditions under which a message should be skipped */
  skipWhen?: SkipRule[];
}

// --- Metadata ---

export interface ManifestMeta {
  /** Reliability level */
  reliability: "high" | "medium" | "low";
  /** Coverage description */
  coverage?: string;
  /** Last verified date */
  lastVerified?: string;
  /** Known limitations */
  knownLimitations?: string[];
}

// === Top-level Manifest ===

export interface AdapterManifest {
  /** Unique identifier */
  id: string;
  /** Version string */
  version: string;
  /** Human-readable name */
  name: string;
  /** Provider identifier */
  provider: string;

  /** Platform identification config */
  urls: UrlPatternConfig;
  /** Auth configuration */
  auth: AuthConfig;
  /** Conversation data endpoint */
  endpoint: ConversationEndpoint;
  /** Message parsing rules */
  parsing: MessageParseConfig;
  /** UI injection config */
  injection: InjectionConfig;
  /** Theme configuration */
  theme: ThemeConfig;
  /** Message filter rules */
  filters?: MessageFilter;
  /** Metadata */
  meta?: ManifestMeta;

  /**
   * Conversation page URL template for synthesizing a URL from a conversationId.
   * Example: "https://chatgpt.com/c/{conversationId}"
   */
  conversationUrlTemplate: string;
}
