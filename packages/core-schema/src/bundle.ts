import { z } from "zod";

export const BundleFormat = z.enum(["full", "user-only", "code-only", "compact"]);
export type BundleFormat = z.infer<typeof BundleFormat>;

export const BundleMeta = z
  .object({
    ctxport: z.literal("v1"),
    source: z.string().optional(),
    url: z.string().optional(),
    title: z.string().optional(),
    date: z.string().datetime().optional(),
    messages: z.number().int().nonnegative().optional(),
    tokens: z.string().optional(),
    format: BundleFormat.optional(),
    bundle: z.literal("merged").optional(),
    conversations: z.number().int().positive().optional(),
    total_messages: z.number().int().nonnegative().optional(),
    total_tokens: z.string().optional(),
  })
  .strict();
export type BundleMeta = z.infer<typeof BundleMeta>;
