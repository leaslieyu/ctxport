import { z } from "zod";
import { type Conversation } from "./conversation";

export const AdapterInputType = z.enum(["ext"]);
export type AdapterInputType = z.infer<typeof AdapterInputType>;

export const ExtInput = z
  .object({
    type: z.literal(AdapterInputType.enum.ext),
    document: z.custom<Document>(),
    url: z.string().url(),
  })
  .strict();
export type ExtInput = z.infer<typeof ExtInput>;

export const AdapterInput = ExtInput;
export type AdapterInput = z.infer<typeof AdapterInput>;

export interface Adapter {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly supportedInputTypes: readonly AdapterInputType[];
  canHandle(input: AdapterInput): boolean;
  parse(input: AdapterInput): Promise<Conversation>;
}

export const AdapterMeta = z
  .object({
    id: z.string(),
    version: z.string(),
    name: z.string(),
    supportedInputTypes: z.array(AdapterInputType),
  })
  .strict();
export type AdapterMeta = z.infer<typeof AdapterMeta>;
