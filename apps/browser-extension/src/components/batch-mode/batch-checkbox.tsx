import { useCallback } from "react";
import { useBatchContext } from "./batch-provider";

interface BatchCheckboxProps {
  conversationId: string;
}

export function BatchCheckbox({ conversationId }: BatchCheckboxProps) {
  const { state, selected, toggleSelection } = useBatchContext();

  const handleChange = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSelection(conversationId);
    },
    [conversationId, toggleSelection],
  );

  if (state === "normal") return null;

  const isSelected = selected.has(conversationId);

  return (
    <div
      className="ctxport-batch-checkbox"
      onClick={handleChange}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        marginRight: 6,
        borderRadius: 4,
        border: `2px solid ${isSelected ? "var(--primary, #2563eb)" : "var(--border-light, rgba(0,0,0,0.2))"}`,
        backgroundColor: isSelected
          ? "var(--primary, #2563eb)"
          : "transparent",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 150ms ease",
      }}
    >
      {isSelected && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}
