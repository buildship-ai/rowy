import { useCallback, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { cloneDeep } from "lodash-es";
import type { Row } from "@tanstack/react-table";

import {
  tableScope,
  dragFillStateAtom,
  updateFieldAtom,
  DragFillState,
} from "@src/atoms/tableScope";
import { SUPPORTED_TYPES_PASTE } from "@src/components/Table/useMenuAction";
import { getFieldType } from "@src/components/fields";
import type { ColumnConfig, TableRow } from "@src/types/table";

export interface DragFillCellCoord {
  columnKey: string;
  rowIndex: number;
}

// Determine whether a cell at (columnKey, rowIndex) falls inside the active
// drag-fill highlight range.
export const isCellInDragFillRange = (
  dragState: DragFillState | null,
  coord: DragFillCellCoord
): boolean => {
  if (!dragState || dragState.columnKey !== coord.columnKey) return false;
  const minRow = Math.min(dragState.startRowIndex, dragState.endRowIndex);
  const maxRow = Math.max(dragState.startRowIndex, dragState.endRowIndex);
  return coord.rowIndex >= minRow && coord.rowIndex <= maxRow;
};

export interface DragFillEligibilityInput {
  canEditCells: boolean;
  isReadOnlyCell: boolean;
  columnMeta?: ColumnConfig;
}

// Verify that a column supports drag-fill copying (editable and in the
// paste-supported field type whitelist).
export const canColumnDragFill = (input: DragFillEligibilityInput): boolean => {
  if (!input.canEditCells || input.isReadOnlyCell) return false;
  if (!input.columnMeta || input.columnMeta.editable === false) return false;
  const fieldType = getFieldType(input.columnMeta);
  return SUPPORTED_TYPES_PASTE.has(fieldType);
};

// Resolve target rows between startRowIndex and endRowIndex, excluding the
// origin row so only destination rows receive updates.
export const resolveDragFillTargetRows = <TRow>(
  rows: TRow[],
  dragState: DragFillState | null
): TRow[] => {
  if (!dragState || dragState.startRowIndex === dragState.endRowIndex) {
    return [];
  }
  const minRow = Math.min(dragState.startRowIndex, dragState.endRowIndex);
  const maxRow = Math.max(dragState.startRowIndex, dragState.endRowIndex);
  const targets: TRow[] = [];

  for (let idx = minRow; idx <= maxRow; idx += 1) {
    if (idx !== dragState.startRowIndex && rows[idx] !== undefined) {
      targets.push(rows[idx]);
    }
  }
  return targets;
};

// Coordinate spreadsheet-style drag-and-drop cell fill across rows in TableBody.
export function useDragFill(rows: Row<TableRow>[]) {
  const [dragFillState, setDragFillState] = useAtom(
    dragFillStateAtom,
    tableScope
  );
  const updateField = useSetAtom(updateFieldAtom, tableScope);

  const commitDragFill = useCallback(() => {
    if (!dragFillState) return;
    const targetRows = resolveDragFillTargetRows(rows, dragFillState);
    setDragFillState(null);

    for (const targetRow of targetRows) {
      updateField({
        path: targetRow.original._rowy_ref.path,
        fieldName: dragFillState.columnKey,
        value: cloneDeep(dragFillState.sourceValue),
        arrayTableData: targetRow.original._rowy_ref.arrayTableData,
      });
    }
  }, [dragFillState, rows, setDragFillState, updateField]);

  useEffect(() => {
    if (!dragFillState) return;
    const handleWindowMouseUp = () => commitDragFill();
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [dragFillState, commitDragFill]);

  return {
    dragFillState,
    setDragFillState,
    commitDragFill,
  };
}

export default useDragFill;
