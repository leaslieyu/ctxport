import type {
  Adapter,
  AdapterInput,
  AdapterMeta,
  Conversation,
  AppError,
} from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";

const adapters = new Map<string, Adapter>();

export function registerAdapter(adapter: Adapter): void {
  if (adapters.has(adapter.id)) {
    throw new Error(
      `Adapter with id "${adapter.id}" is already registered.`,
    );
  }
  adapters.set(adapter.id, adapter);
}

export function unregisterAdapter(adapterId: string): boolean {
  return adapters.delete(adapterId);
}

export function getAdapters(): Adapter[] {
  return Array.from(adapters.values());
}

export function getAdapter(adapterId: string): Adapter | undefined {
  return adapters.get(adapterId);
}

export function getAdaptersMeta(): AdapterMeta[] {
  return getAdapters().map((adapter) => ({
    id: adapter.id,
    version: adapter.version,
    name: adapter.name,
    supportedInputTypes: [...adapter.supportedInputTypes],
  }));
}

export interface ParseResult {
  conversation: Conversation;
  adapterId: string;
  adapterVersion: string;
}

export async function parseWithAdapters(
  input: AdapterInput,
): Promise<ParseResult> {
  const compatibleAdapters = getAdapters().filter((adapter) => {
    try {
      return adapter.canHandle(input);
    } catch {
      return false;
    }
  });

  if (compatibleAdapters.length === 0) {
    throw createAppError(
      "E-PARSE-001",
      `No adapter found for input type "${input.type}"`,
    );
  }

  let lastError: AppError | Error | undefined;

  for (const adapter of compatibleAdapters) {
    try {
      const conversation = await adapter.parse(input);
      return {
        conversation,
        adapterId: adapter.id,
        adapterVersion: adapter.version,
      };
    } catch (error) {
      lastError = error as AppError | Error;
    }
  }

  if (lastError && "code" in lastError) {
    throw lastError;
  }

  throw createAppError(
    "E-PARSE-002",
    lastError?.message ?? "All compatible adapters failed to parse input",
  );
}

export function clearAdapters(): void {
  adapters.clear();
}
