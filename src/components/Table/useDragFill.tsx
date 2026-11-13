import { useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnackbar } from "notistack";
import { get } from "lodash-es";

import {
  tableScope,
  selectedCellAtom,
  cellFillRangeAtom,
  tableRowsAtom,
  tableSchemaAtom,
  updateFieldAtom,
} from "@src/atoms/tableScope";
import type { CellFillRange } from "@src/atoms/tableScope";
import { getFieldType } from "@src/components/fields";
import { SUPPORTED_TYPES_PASTE } from "./useMenuAction";

/** Attribute rendered on the fill handle of the selected cell */
export const FILL_HANDLE_ATTRIBUTE = "data-fill-handle";

/**
 * Computes the inclusive range of row indices to fill when dragging from
 * `sourceIndex` to `targetIndex`. Supports dragging up or down.
 */
export function computeFillRange(
  columnKey: string,
  sourceIndex: number,
  targetIndex: number
): CellFillRange {
  return {
    columnKey,
    startIndex: Math.min(sourceIndex, targetIndex),
    endIndex: Math.max(sourceIndex, targetIndex),
  };
}

/**
 * Implements drag-and-drop fill (like Excel / Google Sheets): the selected
 * editable cell renders a fill handle. Dragging the handle over cells in the
 * same column highlights the range, and releasing the mouse copies the
 * source cell’s value into every cell in the range.
 */
export function useDragFill({ canEditCells }: { canEditCells: boolean }) {
  const [selectedCell] = useAtom(selectedCellAtom, tableScope);
  const [tableRows] = useAtom(tableRowsAtom, tableScope);
  const [tableSchema] = useAtom(tableSchemaAtom, tableScope);
  const setCellFillRange = useSetAtom(cellFillRangeAtom, tableScope);
  const updateField = useSetAtom(updateFieldAtom, tableScope);
  const { enqueueSnackbar } = useSnackbar();

  const dragState = useRef<{
    columnKey: string;
    fieldName: string;
    sourceIndex: number;
    value: any;
    arrayIndex?: number;
  } | null>(null);
  const fillRange = useRef<CellFillRange | null>(null);

  useEffect(() => {
    if (!canEditCells) return;

    const findRowIndex = (path: string, arrayIndex?: number) =>
      tableRows.findIndex(
        (row) =>
          row._rowy_ref.path === path &&
          row._rowy_ref.arrayTableData?.index === arrayIndex
      );

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest?.(`[${FILL_HANDLE_ATTRIBUTE}]`)) return;
      if (!selectedCell || selectedCell.focusInside) return;

      const column = tableSchema.columns?.[selectedCell.columnKey];
      if (!column || column.editable === false) return;
      if (!SUPPORTED_TYPES_PASTE.has(getFieldType(column))) return;

      const sourceIndex = findRowIndex(
        selectedCell.path,
        selectedCell.arrayIndex
      );
      if (sourceIndex < 0) return;

      e.preventDefault();
      dragState.current = {
        columnKey: selectedCell.columnKey,
        fieldName: column.fieldName,
        sourceIndex,
        value: get(tableRows[sourceIndex], column.fieldName),
        arrayIndex: selectedCell.arrayIndex,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragState.current;
      if (!drag) return;

      const cellEl = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest?.('[role="gridcell"]') as HTMLElement | null;
      const rowId = cellEl?.getAttribute("data-row-id");
      const colId = cellEl?.getAttribute("data-col-id");

      const targetIndex =
        rowId && colId === drag.columnKey
          ? findRowIndex(rowId, drag.arrayIndex)
          : -1;

      fillRange.current =
        targetIndex >= 0
          ? computeFillRange(drag.columnKey, drag.sourceIndex, targetIndex)
          : null;
      setCellFillRange(fillRange.current);
    };

    const handleMouseUp = () => {
      const drag = dragState.current;
      const range = fillRange.current;
      dragState.current = null;
      fillRange.current = null;
      setCellFillRange(null);
      if (!drag || !range) return;

      const updates: Promise<unknown>[] = [];
      for (let i = range.startIndex; i <= range.endIndex; i++) {
        if (i === drag.sourceIndex) continue;
        const row = tableRows[i];
        if (!row) continue;
        updates.push(
          Promise.resolve(
            updateField({
              path: row._rowy_ref.path,
              fieldName: drag.fieldName,
              value: drag.value,
              arrayTableData: row._rowy_ref.arrayTableData
                ? { index: row._rowy_ref.arrayTableData.index }
                : undefined,
            })
          ).catch((error) => {
            enqueueSnackbar(`Fill error: ${error}`, { variant: "error" });
          })
        );
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dragState.current = null;
      fillRange.current = null;
      setCellFillRange(null);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canEditCells,
    selectedCell,
    tableRows,
    tableSchema,
    updateField,
    setCellFillRange,
    enqueueSnackbar,
  ]);
}

export default useDragFill;
