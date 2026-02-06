import { useCallback, useState, useEffect, useRef } from "react";
import { useBatchContext } from "./batch-provider";
import type { BundleFormatType } from "@ctxport/core-markdown";

interface BatchBarProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export function BatchBar({ onToast }: BatchBarProps) {
  const { state, selected, result, progress, copySelected, toggleBatchMode } =
    useBatchContext();
  const [format, setFormat] = useState<BundleFormatType>("full");

  const handleCopy = useCallback(async () => {
    await copySelected(format);
  }, [copySelected, format]);

  if (state === "normal") return null;

  const bgColor = (() => {
    if (state === "success") return "rgba(34, 197, 94, 0.12)";
    if (state === "partial-fail") return "rgba(249, 115, 22, 0.12)";
    return "var(--surface-primary, rgba(255,255,255,0.95))";
  })();

  // Notify via toast when done (in effect to avoid state update during render)
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;

    if (state === "success" && result) {
      const tokenStr =
        result.estimatedTokens >= 1000
          ? `~${(result.estimatedTokens / 1000).toFixed(1)}K`
          : `~${result.estimatedTokens}`;
      onToast(
        `Copied ${result.succeeded} conversations (${result.messageCount} messages \u00b7 ${tokenStr} tokens)`,
        "success",
      );
    } else if (state === "partial-fail" && result) {
      onToast(
        `Copied ${result.succeeded}/${result.total} conversations (${result.failed} failed)`,
        "error",
      );
    }
  }, [state, result, onToast]);

  return (
    <div
      className="ctxport-batch-bar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        backgroundColor: bgColor,
        borderBottom: "1px solid var(--border-light, rgba(0,0,0,0.08))",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
        color: "var(--text-primary, #333)",
      }}
    >
      {state === "copying" ? (
        <span>
          Copying... ({progress.current}/{progress.total})
        </span>
      ) : (
        <span>{selected.size} selected</span>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
        {state === "selecting" && (
          <>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as BundleFormatType)}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid var(--border-light, rgba(0,0,0,0.15))",
                background: "var(--surface-primary, #fff)",
                color: "var(--text-primary, #333)",
                fontSize: 12,
              }}
            >
              <option value="full">Full</option>
              <option value="user-only">User Only</option>
              <option value="code-only">Code Only</option>
              <option value="compact">Compact</option>
            </select>

            <button
              type="button"
              onClick={handleCopy}
              disabled={selected.size === 0}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "none",
                backgroundColor:
                  selected.size > 0
                    ? "var(--primary, #2563eb)"
                    : "var(--surface-secondary, #ccc)",
                color: selected.size > 0 ? "#fff" : "#999",
                fontSize: 12,
                fontWeight: 500,
                cursor: selected.size > 0 ? "pointer" : "default",
              }}
            >
              Copy All
            </button>
          </>
        )}

        <button
          type="button"
          onClick={toggleBatchMode}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "1px solid var(--border-light, rgba(0,0,0,0.15))",
            background: "transparent",
            color: "var(--text-secondary, #666)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
