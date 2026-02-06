import { createRoot } from "react-dom/client";
import {
  EXTENSION_RUNTIME_MESSAGE,
  isSupportedTabUrl,
} from "~/constants/extension-runtime";

function Popup() {
  const handleCopyCurrent = async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (!tab?.id || !isSupportedTabUrl(tab.url)) return;

    await browser.tabs.sendMessage(tab.id, {
      type: EXTENSION_RUNTIME_MESSAGE.COPY_CURRENT,
    });
    window.close();
  };

  const handleToggleBatch = async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (!tab?.id || !isSupportedTabUrl(tab.url)) return;

    await browser.tabs.sendMessage(tab.id, {
      type: EXTENSION_RUNTIME_MESSAGE.TOGGLE_BATCH,
    });
    window.close();
  };

  return (
    <div
      style={{
        width: 240,
        padding: 16,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 12,
          color: "#1a1a1a",
        }}
      >
        CtxPort
      </h1>
      <p
        style={{
          fontSize: 12,
          color: "#666",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        Copy AI conversations as Context Bundles.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={handleCopyCurrent}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            backgroundColor: "#2563eb",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Copy Current Conversation
        </button>

        <button
          type="button"
          onClick={handleToggleBatch}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            backgroundColor: "#fff",
            color: "#333",
            fontSize: 13,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Batch Selection Mode
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid #eee",
          fontSize: 11,
          color: "#999",
          lineHeight: 1.6,
        }}
      >
        <div>Cmd+Shift+C &mdash; Copy current</div>
        <div>Cmd+Shift+E &mdash; Batch mode</div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Popup />);
