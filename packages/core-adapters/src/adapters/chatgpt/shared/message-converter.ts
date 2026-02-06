import type { RawMessage } from "../../../base";
import { ContentType, MessageRole } from "./constants";
import {
  flattenMessageContent,
  type FlattenContext,
} from "./content-flatteners";
import { stripCitationTokens } from "./text-processor";
import type { MessageNode, ShareData } from "./types";

const SkipReason = {
  NO_MESSAGE: "no_message",
  SYSTEM_ROLE: "system_role",
  INVALID_ROLE: "invalid_role",
  HIDDEN_THOUGHTS: "hidden_thoughts",
  HIDDEN_CODE: "hidden_code",
  VISUALLY_HIDDEN: "visually_hidden",
  REDACTED: "redacted",
  USER_SYSTEM_MESSAGE: "user_system_message",
  REASONING_STATUS: "reasoning_status",
  NO_CONTENT: "no_content",
} as const;

function shouldSkipMessage(
  node: MessageNode | undefined,
): (typeof SkipReason)[keyof typeof SkipReason] | null {
  if (!node?.message) {
    return SkipReason.NO_MESSAGE;
  }

  const message = node.message;
  const role = message.author?.role;

  if (role === MessageRole.SYSTEM) {
    return SkipReason.SYSTEM_ROLE;
  }

  if (
    role !== MessageRole.USER &&
    role !== MessageRole.ASSISTANT &&
    role !== MessageRole.TOOL
  ) {
    return SkipReason.INVALID_ROLE;
  }

  if (message.content?.content_type === ContentType.THOUGHTS) {
    return SkipReason.HIDDEN_THOUGHTS;
  }

  if (message.content?.content_type === ContentType.CODE) {
    return SkipReason.HIDDEN_CODE;
  }

  if (message.metadata?.is_visually_hidden_from_conversation) {
    return SkipReason.VISUALLY_HIDDEN;
  }

  if (message.metadata?.is_redacted) {
    return SkipReason.REDACTED;
  }

  if (message.metadata?.is_user_system_message) {
    return SkipReason.USER_SYSTEM_MESSAGE;
  }

  if (Boolean(message.metadata?.reasoning_status)) {
    return SkipReason.REASONING_STATUS;
  }

  if (!message.content) {
    return SkipReason.NO_CONTENT;
  }

  return null;
}

export async function convertShareDataToMessages(
  data: ShareData,
  sharedConversationId: string | undefined,
  cookies: string | undefined,
): Promise<RawMessage[]> {
  const mapping = data.mapping ?? {};
  const sequence = data.linear_conversation ?? [];
  const messages: RawMessage[] = [];

  const baseFlattenContext: FlattenContext = {
    sharedConversationId,
    cookies,
  };

  for (const entry of sequence) {
    const nodeId = entry.id;
    if (!nodeId) continue;

    const node = mapping[nodeId];
    if (!node) continue;

    const skipReason = shouldSkipMessage(node);
    if (skipReason) continue;

    const message = node.message!;
    const role = message.author!.role!;
    const content = message.content!;

    const messageConversationId =
      message.metadata?.shared_conversation_id || sharedConversationId;

    const ctx: FlattenContext = messageConversationId
      ? { sharedConversationId: messageConversationId, cookies }
      : baseFlattenContext;

    let text = await flattenMessageContent(content, ctx);
    text = stripCitationTokens(text);

    if (!text.trim()) continue;

    messages.push({
      role: role === MessageRole.USER ? "user" : "assistant",
      content: text,
    });
  }

  return messages;
}
