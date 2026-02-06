import { useState, useCallback, useRef, useEffect } from "react";
import { useCopyConversation, type CopyState } from "~/hooks/use-copy-conversation";
import { ContextMenu } from "./context-menu";
import type { BundleFormatType } from "@ctxport/core-markdown";

interface CopyButtonProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export function CopyButton({ onToast }: CopyButtonProps) {
  const { state, result, error, copy } = useCopyConversation();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handleClick = useCallback(async () => {
    await copy("full");
  }, [copy]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleFormatSelect = useCallback(
    async (format: BundleFormatType) => {
      await copy(format);
    },
    [copy],
  );

  // Show toast on state change (in effect to avoid state update during render)
  const prevStateRef = useRef<CopyState>("idle");
  useEffect(() => {
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;

    if (state === "success" && result) {
      const tokenStr = result.estimatedTokens >= 1000
        ? `~${(result.estimatedTokens / 1000).toFixed(1)}K`
        : `~${result.estimatedTokens}`;
      onToast(`Copied ${result.messageCount} messages \u00b7 ${tokenStr} tokens`, "success");
    } else if (state === "error" && error) {
      onToast(`Copy failed: ${error}`, "error");
    }
  }, [state, result, error, onToast]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={state === "loading"}
        title="Copy as Context Bundle (CtxPort)"
        className="ctxport-copy-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          padding: 0,
          border: "none",
          borderRadius: 6,
          background: "transparent",
          cursor: state === "loading" ? "wait" : "pointer",
          color: iconColor(state),
          opacity: state === "loading" ? 0.6 : 1,
          transition: "color 150ms ease, opacity 150ms ease",
        }}
      >
        <IconForState state={state} />
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onSelect={handleFormatSelect}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

function iconColor(state: CopyState): string {
  switch (state) {
    case "success":
      return "#16a34a";
    case "error":
      return "#ea580c";
    default:
      return "var(--text-secondary, currentColor)";
  }
}

function IconForState({ state }: { state: CopyState }) {
  if (state === "loading") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
        </path>
      </svg>
    );
  }

  if (state === "success") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  if (state === "error") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  // idle — clipboard icon
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
