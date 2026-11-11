import { useCallback, useState } from "react";
import {
  buildDragFillUpdates,
  computeDragFillRowRange,
} from "./dragFillUtils.mjs";

export interface DragFillState {
  active: boolean;
  columnId: string | null;
  fieldType: string | null;
  startRowIndex: number | null;
  hoverRowIndex: number | null;
}

export function useDragFill(params: {
  rows: Array<Record<string, any>>;
  onApplyBatchUpdates: (
    updates: Array<{ rowId: string; rowIndex: number; columnId: string; value: any }>
  ) => Promise<void> | void;
}) {
  const [dragState, setDragState] = useState<DragFillState>({
    active: false,
    columnId: null,
    fieldType: null,
    startRowIndex: null,
    hoverRowIndex: null,
  });

  const beginDragFill = useCallback(
    (columnId: string, fieldType: string, startRowIndex: number) => {
      setDragState({
        active: true,
        columnId,
        fieldType,
        startRowIndex,
        hoverRowIndex: startRowIndex,
      });
    },
    []
  );

  const updateDragHoverRow = useCallback((rowIndex: number) => {
    setDragState((prev) =>
      prev.active ? { ...prev, hoverRowIndex: rowIndex } : prev
    );
  }, []);

  const commitDragFill = useCallback(
    async (isReadOnly = false) => {
      if (
        !dragState.active ||
        dragState.columnId === null ||
        dragState.startRowIndex === null ||
        dragState.hoverRowIndex === null
      ) {
        return [];
      }
      const updates = buildDragFillUpdates({
        rows: params.rows,
        columnId: dragState.columnId,
        fieldType: dragState.fieldType || "SHORT_TEXT",
        isReadOnly,
        startRowIndex: dragState.startRowIndex,
        endRowIndex: dragState.hoverRowIndex,
      });
      setDragState({
        active: false,
        columnId: null,
        fieldType: null,
        startRowIndex: null,
        hoverRowIndex: null,
      });
      if (updates.length > 0) {
        await params.onApplyBatchUpdates(updates);
      }
      return updates;
    },
    [dragState, params]
  );

  const highlightedRows =
    dragState.active &&
    dragState.startRowIndex !== null &&
    dragState.hoverRowIndex !== null
      ? computeDragFillRowRange(dragState.startRowIndex, dragState.hoverRowIndex)
      : [];

  return {
    dragState,
    highlightedRows,
    beginDragFill,
    updateDragHoverRow,
    commitDragFill,
  };
}
