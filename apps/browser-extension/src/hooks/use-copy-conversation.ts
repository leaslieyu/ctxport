import { useState, useCallback } from "react";
import { parseWithAdapters, registerBuiltinAdapters } from "@ctxport/core-adapters";
import { serializeConversation, type BundleFormatType } from "@ctxport/core-markdown";
import { writeToClipboard } from "~/lib/utils";

export type CopyState = "idle" | "loading" | "success" | "error";

export interface CopyResult {
  messageCount: number;
  estimatedTokens: number;
}

let adaptersRegistered = false;

function ensureAdapters() {
  if (!adaptersRegistered) {
    registerBuiltinAdapters();
    adaptersRegistered = true;
  }
}

export function useCopyConversation() {
  const [state, setState] = useState<CopyState>("idle");
  const [result, setResult] = useState<CopyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(
    async (format: BundleFormatType = "full") => {
      setState("loading");
      setError(null);
      setResult(null);

      try {
        ensureAdapters();

        const parseResult = await parseWithAdapters({
          type: "ext",
          document: document,
          url: window.location.href,
        });

        const serialized = serializeConversation(parseResult.conversation, {
          format,
        });

        await writeToClipboard(serialized.markdown);

        setResult({
          messageCount: serialized.messageCount,
          estimatedTokens: serialized.estimatedTokens,
        });
        setState("success");

        setTimeout(() => {
          setState("idle");
          setResult(null);
        }, 1500);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setState("error");

        setTimeout(() => {
          setState("idle");
          setError(null);
        }, 3000);
      }
    },
    [],
  );

  return { state, result, error, copy };
}
