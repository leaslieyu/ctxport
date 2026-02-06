import { z } from "zod";

export const MessageRole = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof MessageRole>;

export const ContentMeta = z
  .object({
    containsCodeBlock: z.boolean().optional(),
    containsImage: z.boolean().optional(),
  })
  .strict();
export type ContentMeta = z.infer<typeof ContentMeta>;

export const Message = z
  .object({
    id: z.string().uuid(),
    role: MessageRole,
    contentMarkdown: z.string(),
    order: z.number().int().nonnegative(),
    contentMeta: ContentMeta.optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .strict();
export type Message = z.infer<typeof Message>;

export function createMessage(
  partial: Pick<Message, "id" | "role" | "contentMarkdown" | "order"> &
    Partial<Message>,
): Message {
  return Message.parse({
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  });
}
