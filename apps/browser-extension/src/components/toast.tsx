import { useState, useEffect, useCallback } from "react";

export interface ToastData {
  message: string;
  type: "success" | "error";
}

interface ToastProps {
  data: ToastData | null;
  onDismiss: () => void;
}

export function Toast({ data, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) {
      setVisible(false);
      return;
    }

    // fade in
    requestAnimationFrame(() => setVisible(true));

    const duration = data.type === "success" ? 1500 : 3000;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [data, onDismiss]);

  if (!data) return null;

  const bgColor =
    data.type === "success"
      ? "rgba(34, 197, 94, 0.15)"
      : "rgba(249, 115, 22, 0.15)";
  const textColor = data.type === "success" ? "#16a34a" : "#ea580c";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 100000,
        padding: "8px 16px",
        borderRadius: 8,
        backgroundColor: bgColor,
        color: textColor,
        fontSize: 13,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 200ms ease, transform 200ms ease",
        pointerEvents: "none",
      }}
    >
      {data.message}
    </div>
  );
}
