import { useState, useEffect, useRef, useCallback } from "react";
import type { BundleFormatType } from "@ctxport/core-markdown";

interface ContextMenuProps {
  x: number;
  y: number;
  onSelect: (format: BundleFormatType) => void;
  onClose: () => void;
}

const FORMAT_OPTIONS: { label: string; value: BundleFormatType }[] = [
  { label: "Copy full conversation", value: "full" },
  { label: "User messages only", value: "user-only" },
  { label: "Code blocks only", value: "code-only" },
  { label: "Compact", value: "compact" },
];

export function ContextMenu({ x, y, onSelect, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 100001,
        minWidth: 200,
        padding: "4px 0",
        borderRadius: 8,
        backgroundColor: "var(--surface-primary, #fff)",
        border: "1px solid var(--border-light, rgba(0,0,0,0.1))",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
      }}
    >
      {FORMAT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            onSelect(opt.value);
            onClose();
          }}
          style={{
            display: "block",
            width: "100%",
            padding: "8px 16px",
            textAlign: "left",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-primary, #333)",
            fontSize: 13,
            lineHeight: 1.4,
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor =
              "var(--surface-secondary, rgba(0,0,0,0.05))";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          {opt.value === "full" ? "\u2713 " : "  "}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
