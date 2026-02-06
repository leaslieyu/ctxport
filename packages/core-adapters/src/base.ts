import type {
  Conversation,
  Message,
  MessageRole,
  Provider,
  SourceType,
} from "@ctxport/core-schema";
import { createConversation, createMessage } from "@ctxport/core-schema";
import { v4 as uuidv4 } from "uuid";

export interface AdapterConfig {
  id: string;
  version: string;
  name: string;
}

export interface ConversationOptions {
  sourceType: SourceType;
  provider: Provider;
  adapterId: string;
  adapterVersion: string;
  title?: string;
  url?: string;
}

export interface RawMessage {
  role: MessageRole;
  content: string;
}

export function generateId(): string {
  return uuidv4();
}

export function buildMessages(rawMessages: RawMessage[]): Message[] {
  return rawMessages.map((raw, index) =>
    createMessage({
      id: generateId(),
      role: raw.role,
      contentMarkdown: raw.content,
      order: index,
      contentMeta: {
        containsCodeBlock: raw.content.includes("```"),
        containsImage:
          raw.content.includes("![") || raw.content.includes("<img"),
      },
    }),
  );
}

export function buildConversation(
  rawMessages: RawMessage[],
  options: ConversationOptions,
): Conversation {
  const messages = buildMessages(rawMessages);
  const now = new Date().toISOString();

  return createConversation({
    id: generateId(),
    sourceType: options.sourceType,
    title: options.title,
    messages,
    sourceMeta: {
      provider: options.provider,
      url: options.url,
      parsedAt: now,
      adapterId: options.adapterId,
      adapterVersion: options.adapterVersion,
    },
  });
}
