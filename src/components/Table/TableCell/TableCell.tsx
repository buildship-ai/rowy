import { memo } from "react";
import { useSetAtom } from "jotai";
import { ErrorBoundary } from "react-error-boundary";
import { flexRender } from "@tanstack/react-table";
import type { Row, Cell } from "@tanstack/react-table";

import ErrorIcon from "@mui/icons-material/ErrorOutline";
import WarningIcon from "@mui/icons-material/WarningAmber";

import StyledCell from "@src/components/Table/Styled/StyledCell";
import { InlineErrorFallback } from "@src/components/ErrorFallback";
import RichTooltip from "@src/components/RichTooltip";
import StyledDot from "@src/components/Table/Styled/StyledDot";

import {
  tableScope,
  selectedCellAtom,
  contextMenuTargetAtom,
} from "@src/atoms/tableScope";
import { TABLE_PADDING } from "@src/components/Table";
import type { TableRow } from "@src/types/table";
import type { IRenderedTableCellProps } from "./withRenderTableCell";

export interface ITableCellProps {
  /** Current row with context from TanStack Table state */
  row: Row<TableRow>;
  /** Current cell with context from TanStack Table state */
  cell: Cell<TableRow, any>;
  /** Virtual cell index (column index) */
  index: number;
  /** User has clicked or navigated to this cell */
  isSelectedCell: boolean;
  /** User has double-clicked or pressed Enter and this cell is selected */
  focusInsideCell: boolean;
  /**
   * Used to disable `aria-description` that says “Press Enter to edit”
   * for Auditing and Metadata cells. Need to find another way to do this.
   */
  isReadOnlyCell: boolean;
  /** Determines if EditorCell can be displayed */
  canEditCells: boolean;
  /**
   * Pass current row height as a prop so we don’t access `tableSchema` here.
   * If that atom is listened to here, all table cells will re-render whenever
   * `tableSchema` changes, which is unnecessary.
   */
  rowHeight: number;
  /** If true, renders a shadow */
  isLastFrozen: boolean;
  /** Pass width as a prop to get local column sizing state */
  width: number;
  /**
   * If provided, cell is pinned/frozen, and this value is used for
   * `position: sticky`.
   */
  left: number;
  isPinned: boolean;
  /** Whether this cell is part of an active drag-to-fill target range */
  isDragFillTarget?: boolean;
  /** Whether this cell can be drag-filled to adjacent rows */
  canDragFill?: boolean;
  /** Triggered when the user begins dragging the cell fill handle */
  onDragFillStart?: (rowIndex: number, columnId: string) => void;
  /** Triggered when the user hovers over a cell while dragging the fill handle */
  onDragFillHover?: (rowIndex: number, columnId: string) => void;
}

/**
 * Renders the container div for each cell with accessibility attributes for
 * keyboard navigation.
 *
 * - Performs regex & missing value check and renders associated UI
 * - Provides children with value from `cell.getValue()` so they can work with
 *   memoization
 * - Provides helpers as props to aid with memoization, so children components
 *   don’t have to read atoms, which may cause unnecessary re-renders of many
 *   cell components
 * - Renders `ErrorBoundary`
 */
export const TableCell = memo(function TableCell({
  row,
  cell,
  index,
  isSelectedCell,
  focusInsideCell,
  isReadOnlyCell,
  canEditCells,
  rowHeight,
  isLastFrozen,
  width,
  left,
  isPinned,
  isDragFillTarget,
  canDragFill,
  onDragFillStart,
  onDragFillHover,
}: ITableCellProps) {
  const setSelectedCell = useSetAtom(selectedCellAtom, tableScope);
  const setContextMenuTarget = useSetAtom(contextMenuTargetAtom, tableScope);

  const value = cell.getValue();
  const required = cell.column.columnDef.meta?.config?.required;
  const validationRegex = cell.column.columnDef.meta?.config?.validationRegex;

  const isInvalid = validationRegex && !new RegExp(validationRegex).test(value);
  const isMissing = required && value === undefined;

  let renderedValidationTooltip = null;

  if (isInvalid) {
    renderedValidationTooltip = (
      <RichTooltip
        icon={<ErrorIcon fontSize="inherit" color="error" />}
        title="Invalid data"
        message="This row will not be saved until all the required fields contain valid data"
        placement="right"
        render={({ openTooltip }) => <StyledDot onClick={openTooltip} />}
      />
    );
  } else if (isMissing) {
    renderedValidationTooltip = (
      <RichTooltip
        icon={<WarningIcon fontSize="inherit" color="warning" />}
        title="Required field"
        message="This row will not be saved until all the required fields contain valid data"
        placement="right"
        render={({ openTooltip }) => <StyledDot onClick={openTooltip} />}
      />
    );
  }

  const tableCellComponentProps: IRenderedTableCellProps = {
    ...cell.getContext(),
    value,
    focusInsideCell,
    setFocusInsideCell: (focusInside: boolean) =>
      setSelectedCell({
        arrayIndex: row.original._rowy_ref.arrayTableData?.index,
        path: row.original._rowy_ref.path,
        columnKey: cell.column.id,
        focusInside,
      }),
    disabled: !canEditCells || cell.column.columnDef.meta?.editable === false,
    rowHeight,
  };

  return (
    <StyledCell
      key={cell.id}
      data-row-id={row.id}
      data-col-id={cell.column.id}
      data-frozen={cell.column.getIsPinned() || undefined}
      data-frozen-last={isLastFrozen || undefined}
      data-drag-fill-target={isDragFillTarget || undefined}
      role="gridcell"
      tabIndex={isSelectedCell && !focusInsideCell ? 0 : -1}
      aria-colindex={index + 1}
      aria-readonly={
        !canEditCells || cell.column.columnDef.meta?.editable === false
      }
      aria-required={Boolean(cell.column.columnDef.meta?.config?.required)}
      aria-selected={isSelectedCell}
      aria-describedby={
        canEditCells && !isReadOnlyCell
          ? "rowy-table-editable-cell-description"
          : undefined
      }
      aria-invalid={isInvalid || isMissing}
      style={{
        width,
        height: rowHeight,
        position: isPinned ? "sticky" : "absolute",
        left: left - (isPinned ? TABLE_PADDING : 0),
        backgroundColor:
          cell.column.id === "_rowy_column_actions" ? "transparent" : undefined,
        borderBottomWidth:
          cell.column.id === "_rowy_column_actions" ? 0 : undefined,
        borderRightWidth:
          cell.column.id === "_rowy_column_actions" ? 0 : undefined,
      }}
      onMouseEnter={() => {
        onDragFillHover?.(row.index, cell.column.id);
      }}
      onClick={(e) => {
        setSelectedCell({
          arrayIndex: row.original._rowy_ref.arrayTableData?.index,
          path: row.original._rowy_ref.path,
          columnKey: cell.column.id,
          focusInside: false,
        });
        (e.target as HTMLDivElement).focus();
      }}
      onDoubleClick={(e) => {
        setSelectedCell({
          arrayIndex: row.original._rowy_ref.arrayTableData?.index,
          path: row.original._rowy_ref.path,
          columnKey: cell.column.id,
          focusInside: true,
        });
        (e.target as HTMLDivElement).focus();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        let isEditorCell = false;

        setSelectedCell((prev) => {
          isEditorCell = prev?.focusInside === true;
          return {
            arrayIndex: row.original._rowy_ref.arrayTableData?.index,
            path: row.original._rowy_ref.path,
            columnKey: cell.column.id,
            focusInside: false,
          };
        });
        (e.target as HTMLDivElement).focus();
        if (!isEditorCell) {
          setContextMenuTarget(e.target as HTMLElement);
        }
      }}
    >
      {renderedValidationTooltip}
      <ErrorBoundary fallbackRender={InlineErrorFallback}>
        {flexRender(cell.column.columnDef.cell, tableCellComponentProps)}
      </ErrorBoundary>
      {isSelectedCell && !focusInsideCell && canDragFill && (
        <div
          className="cell-fill-handle"
          data-testid="cell-fill-handle"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDragFillStart?.(row.index, cell.column.id);
          }}
        />
      )}
    </StyledCell>
  );
});

export default TableCell;
