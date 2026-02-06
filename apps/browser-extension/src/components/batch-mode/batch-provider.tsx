import { createContext, useContext } from "react";
import { useBatchMode, type BatchState, type BatchResult } from "~/hooks/use-batch-mode";
import type { BundleFormatType } from "@ctxport/core-markdown";

interface BatchContextValue {
  state: BatchState;
  selected: Set<string>;
  result: BatchResult | null;
  progress: { current: number; total: number };
  toggleBatchMode: () => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  copySelected: (format?: BundleFormatType) => Promise<void>;
}

const BatchContext = createContext<BatchContextValue | null>(null);

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const batch = useBatchMode();

  return (
    <BatchContext.Provider value={batch}>{children}</BatchContext.Provider>
  );
}

export function useBatchContext(): BatchContextValue {
  const ctx = useContext(BatchContext);
  if (!ctx) throw new Error("useBatchContext must be used within BatchProvider");
  return ctx;
}
