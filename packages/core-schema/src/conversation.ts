import { z } from "zod";
import { Message } from "./message";

export const SourceType = z.enum([
  "extension-current",
  "extension-list",
]);
export type SourceType = z.infer<typeof SourceType>;

export const Provider = z.enum(["chatgpt", "claude", "unknown"]);
export type Provider = z.infer<typeof Provider>;

export const SourceMeta = z
  .object({
    provider: Provider,
    url: z.string().url().optional(),
    parsedAt: z.string().datetime().optional(),
    adapterId: z.string().optional(),
    adapterVersion: z.string().optional(),
  })
  .strict();
export type SourceMeta = z.infer<typeof SourceMeta>;

export const Conversation = z
  .object({
    id: z.string().uuid(),
    sourceType: SourceType,
    title: z.string().optional(),
    messages: z.array(Message),
    sourceMeta: SourceMeta.optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (conv) => {
      return conv.messages.every((msg, idx) => msg.order === idx);
    },
    { message: "Message order must be sequential starting from 0" },
  );
export type Conversation = z.infer<typeof Conversation>;

export function createConversation(
  partial: Pick<Conversation, "id" | "sourceType" | "messages"> &
    Partial<Conversation>,
): Conversation {
  return Conversation.parse({
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  });
}
