import { useState, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useExtensionUrl } from "~/hooks/use-extension-url";
import { CopyButton } from "./copy-button";
import { ListCopyIcon } from "./list-copy-icon";
import { Toast, type ToastData } from "./toast";
import { BatchProvider } from "./batch-mode/batch-provider";
import { BatchBar } from "./batch-mode/batch-bar";
import { BatchCheckbox } from "./batch-mode/batch-checkbox";
import { ChatGPTInjector } from "~/injectors/chatgpt-injector";
import { ClaudeInjector } from "~/injectors/claude-injector";
import type { PlatformInjector } from "~/injectors/base-injector";
import { EXTENSION_WINDOW_EVENT } from "~/constants/extension-runtime";

function detectPlatform(url: string): "chatgpt" | "claude" | null {
  if (/chatgpt\.com|chat\.openai\.com/.test(url)) return "chatgpt";
  if (/claude\.ai/.test(url)) return "claude";
  return null;
}

export default function App() {
  const url = useExtensionUrl();
  const [toast, setToast] = useState<ToastData | null>(null);
  const injectorRef = useRef<PlatformInjector | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
    },
    [],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    // Clean up previous injector
    injectorRef.current?.cleanup();
    injectorRef.current = null;

    const platform = detectPlatform(url);
    if (!platform) return;

    const injector =
      platform === "chatgpt" ? new ChatGPTInjector() : new ClaudeInjector();
    injectorRef.current = injector;

    // Inject copy button in conversation detail header
    injector.injectCopyButton((container) => {
      const root = createRoot(container);
      root.render(<CopyButton onToast={showToast} />);
    });

    // Inject copy icons in sidebar list
    injector.injectListIcons((container, conversationId) => {
      const root = createRoot(container);
      root.render(
        <ListCopyIcon
          conversationId={conversationId}
          provider={platform}
          onToast={showToast}
        />,
      );
    });

    return () => {
      injector.cleanup();
    };
  }, [url, showToast]);

  // Listen for keyboard shortcuts via window events
  useEffect(() => {
    const handleCopyCurrent = () => {
      // Trigger copy from the already-mounted CopyButton
      const btn = document.querySelector<HTMLButtonElement>(".ctxport-copy-btn button");
      btn?.click();
    };

    const handleToggleBatch = () => {
      window.dispatchEvent(new Event(EXTENSION_WINDOW_EVENT.TOGGLE_BATCH));
    };

    window.addEventListener(EXTENSION_WINDOW_EVENT.COPY_SUCCESS, handleCopyCurrent);
    window.addEventListener(EXTENSION_WINDOW_EVENT.TOGGLE_BATCH, handleToggleBatch);

    return () => {
      window.removeEventListener(EXTENSION_WINDOW_EVENT.COPY_SUCCESS, handleCopyCurrent);
      window.removeEventListener(EXTENSION_WINDOW_EVENT.TOGGLE_BATCH, handleToggleBatch);
    };
  }, []);

  return (
    <BatchProvider>
      <Toast data={toast} onDismiss={dismissToast} />
      <BatchBar onToast={showToast} />
    </BatchProvider>
  );
}
