import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useExtensionUrl } from "~/hooks/use-extension-url";
import { CopyButton } from "./copy-button";
import { ListCopyIcon } from "./list-copy-icon";
import { Toast, type ToastData } from "./toast";
import { BatchProvider } from "./batch-mode/batch-provider";
import { BatchBar } from "./batch-mode/batch-bar";
import { EXTENSION_WINDOW_EVENT } from "~/constants/extension-runtime";
import { findPlugin, type Plugin } from "@ctxport/core-plugins";

export default function App() {
  const url = useExtensionUrl();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showFloatingCopy, setShowFloatingCopy] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const plugin = findPlugin(url);

  useEffect(() => {
    // Clean up previous injector
    cleanupRef.current?.();
    cleanupRef.current = null;
    setShowFloatingCopy(false);

    if (!plugin) return;

    if (plugin.injector) {
      plugin.injector.inject(
        { url, document },
        {
          renderCopyButton: (container) => {
            const root = createRoot(container);
            root.render(<CopyButton onToast={showToast} />);
          },
          renderListIcon: (container, itemId) => {
            const root = createRoot(container);
            root.render(
              <ListCopyIcon conversationId={itemId} onToast={showToast} />,
            );
          },
          renderBatchCheckbox: (_container, _itemId) => {
            // Batch checkboxes are handled by BatchProvider
          },
          removeBatchCheckboxes: () => {
            // Handled by injector cleanup
          },
        },
      );

      cleanupRef.current = () => plugin.injector?.cleanup();
    } else {
      // No injector — show floating copy button as fallback
      setShowFloatingCopy(true);
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [url, plugin, showToast]);

  // Listen for keyboard shortcuts via window events
  useEffect(() => {
    const handleCopyCurrent = () => {
      const btn = document.querySelector<HTMLButtonElement>(
        ".ctxport-copy-btn button",
      );
      btn?.click();
    };

    const handleToggleBatch = () => {
      window.dispatchEvent(new Event(EXTENSION_WINDOW_EVENT.TOGGLE_BATCH));
    };

    window.addEventListener(
      EXTENSION_WINDOW_EVENT.COPY_SUCCESS,
      handleCopyCurrent,
    );
    window.addEventListener(
      EXTENSION_WINDOW_EVENT.TOGGLE_BATCH,
      handleToggleBatch,
    );

    return () => {
      window.removeEventListener(
        EXTENSION_WINDOW_EVENT.COPY_SUCCESS,
        handleCopyCurrent,
      );
      window.removeEventListener(
        EXTENSION_WINDOW_EVENT.TOGGLE_BATCH,
        handleToggleBatch,
      );
    };
  }, []);

  return (
    <BatchProvider>
      <Toast data={toast} onDismiss={dismissToast} />
      <BatchBar onToast={showToast} />
      {showFloatingCopy && plugin && (
        <FloatingCopyButton onToast={showToast} />
      )}
    </BatchProvider>
  );
}

/** Floating copy button rendered inside Shadow DOM overlay as fallback */
function FloatingCopyButton({
  onToast,
}: {
  onToast: (message: string, type: "success" | "error") => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--bg-primary, #1a1a2e)",
        borderRadius: 12,
        padding: "8px 12px",
        boxShadow:
          "0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary, #a0a0b0)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          userSelect: "none",
        }}
      >
        CtxPort
      </span>
      <CopyButton onToast={onToast} />
    </div>
  );
}
