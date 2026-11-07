import { memo } from "react";
import { useAtom } from "jotai";
import {
  Column,
  Row,
  Cell,
  ColumnSizingState,
  flexRender,
} from "@tanstack/react-table";
import type { VirtualItem } from "@tanstack/react-virtual";

import StyledRow from "./Styled/StyledRow";
import OutOfOrderIndicator from "./OutOfOrderIndicator";
import TableCell from "./TableCell";
import { RowsSkeleton } from "./TableSkeleton";
import useDragFill from "./useDragFill";

import {
  tableScope,
  tableSchemaAtom,
  selectedCellAtom,
  tableNextPageAtom,
  SelectedCell,
} from "@src/atoms/tableScope";

import { getFieldProp } from "@src/components/fields";
import type { TableRow } from "@src/types/table";
import useVirtualization from "./useVirtualization";
import { DEFAULT_ROW_HEIGHT, OUT_OF_ORDER_MARGIN } from "./Table";
import StyledCell from "./Styled/StyledCell";

export interface ITableBodyProps {
  containerEl: HTMLDivElement | null;
  containerRef: React.RefObject<HTMLDivElement>;
  leafColumns: Column<TableRow, unknown>[];
  rows: Row<TableRow>[];
  canEditCells: boolean;
  lastFrozen?: string;
  columnSizing: ColumnSizingState;
}

const isCellSelected = (
  selectedCell: SelectedCell | null,
  row: Row<TableRow>,
  columnId: string
): boolean =>
  selectedCell?.path === row.original._rowy_ref.path &&
  selectedCell?.columnKey === columnId &&
  selectedCell?.arrayIndex === row.original._rowy_ref.arrayTableData?.index;

const isAuditOrMetadataCell = (cell: Cell<TableRow, unknown>): boolean => {
  const fieldTypeGroup = getFieldProp("group", cell.column.columnDef.meta?.type);
  return fieldTypeGroup === "Auditing" || fieldTypeGroup === "Metadata";
};

interface VirtualCellRenderProps {
  row: Row<TableRow>;
  virtualCell: VirtualItem;
  selectedCell: SelectedCell | null;
  canEditCells: boolean;
  lastFrozen?: string;
  rowHeight: number;
}

const renderVirtualCell = (ctx: VirtualCellRenderProps) => {
  const cellIndex = ctx.virtualCell.index;
  const cell = ctx.row.getVisibleCells()[cellIndex];

  if (cell.id.includes("_rowy_select")) {
    return (
      <StyledCell key={cell.id} role="gridcell" data-frozen="left">
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </StyledCell>
    );
  }

  const selected = isCellSelected(ctx.selectedCell, ctx.row, cell.column.id);

  return (
    <TableCell
      key={cell.id}
      row={ctx.row}
      cell={cell}
      index={cellIndex}
      isSelectedCell={selected}
      focusInsideCell={Boolean(selected && ctx.selectedCell?.focusInside)}
      isReadOnlyCell={isAuditOrMetadataCell(cell)}
      canEditCells={ctx.canEditCells}
      isLastFrozen={ctx.lastFrozen === cell.column.id}
      width={cell.column.getSize()}
      rowHeight={ctx.rowHeight}
      left={ctx.virtualCell.start}
      isPinned={cell.column.getIsPinned() === "left"}
    />
  );
};

export const TableBody = memo(function TableBody({
  containerRef,
  leafColumns,
  rows,
  canEditCells,
  lastFrozen,
  columnSizing,
}: ITableBodyProps) {
  const [tableSchema] = useAtom(tableSchemaAtom, tableScope);
  const [selectedCell] = useAtom(selectedCellAtom, tableScope);
  const [tableNextPage] = useAtom(tableNextPageAtom, tableScope);

  useDragFill(rows);

  const {
    virtualRows,
    virtualCols,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  } = useVirtualization(containerRef, leafColumns, columnSizing);

  const rowHeight = tableSchema.rowHeight || DEFAULT_ROW_HEIGHT;

  return (
    <div className="tbody" role="rowgroup">
      {paddingTop > 0 && (
        <div role="presentation" style={{ height: `${paddingTop}px` }} />
      )}

      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        const outOfOrder = row.original._rowy_outOfOrder;

        return (
          <StyledRow
            key={row.id + row.original._rowy_ref.arrayTableData?.index}
            role="row"
            aria-rowindex={row.index + 2}
            style={{
              height: rowHeight,
              marginBottom: outOfOrder ? OUT_OF_ORDER_MARGIN : 0,
              paddingLeft,
              paddingRight,
            }}
            data-out-of-order={outOfOrder || undefined}
          >
            {outOfOrder && <OutOfOrderIndicator />}

            {virtualCols.map((virtualCell) =>
              renderVirtualCell({
                row,
                virtualCell,
                selectedCell,
                canEditCells,
                lastFrozen,
                rowHeight,
              })
            )}
          </StyledRow>
        );
      })}

      {tableNextPage.loading && <RowsSkeleton />}

      {paddingBottom > 0 && (
        <div role="presentation" style={{ height: `${paddingBottom}px` }} />
      )}
    </div>
  );
});

export default TableBody;
