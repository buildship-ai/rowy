import { memo } from "react";
import { useAtom, useSetAtom } from "jotai";
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
  canColumnDragFill,
  isCellInDragFillRange,
} from "@src/components/Table/useDragFill";

import {
  tableScope,
  selectedCellAtom,
  contextMenuTargetAtom,
  dragFillStateAtom,
  DragFillState,
} from "@src/atoms/tableScope";
import { TABLE_PADDING } from "@src/components/Table";
import type { ColumnConfig, TableRow } from "@src/types/table";
import type { IRenderedTableCellProps } from "./withRenderTableCell";

export interface ITableCellProps {
  row: Row<TableRow>;
  cell: Cell<TableRow, any>;
  index: number;
  isSelectedCell: boolean;
  focusInsideCell: boolean;
  isReadOnlyCell: boolean;
  canEditCells: boolean;
  rowHeight: number;
  isLastFrozen: boolean;
  width: number;
  left: number;
  isPinned: boolean;
}

const renderCellValidationTooltip = (
  isInvalid: boolean,
  isMissing: boolean
) => {
  if (isInvalid) {
    return (
      <RichTooltip
        icon={<ErrorIcon fontSize="inherit" color="error" />}
        title="Invalid data"
        message="This row will not be saved until all the required fields contain valid data"
        placement="right"
        render={({ openTooltip }) => <StyledDot onClick={openTooltip} />}
      />
    );
  }
  if (isMissing) {
    return (
      <RichTooltip
        icon={<WarningIcon fontSize="inherit" color="warning" />}
        title="Required field"
        message="This row will not be saved until all the required fields contain valid data"
        placement="right"
        render={({ openTooltip }) => <StyledDot onClick={openTooltip} />}
      />
    );
  }
  return null;
};

const evaluateCellValidation = (
  columnMeta: ColumnConfig | undefined,
  value: any
) => {
  const config = columnMeta ? columnMeta.config : undefined;
  const regex = config ? config.validationRegex : undefined;
  const required = Boolean(config && config.required);
  const isInvalid = Boolean(regex && !new RegExp(regex).test(value));
  const isMissing = Boolean(required && value === undefined);
  return { required, isInvalid, isMissing, ariaInvalid: isInvalid || isMissing };
};

const isCellReadOnly = (
  canEditCells: boolean,
  columnMeta: ColumnConfig | undefined
): boolean => {
  if (!canEditCells) return true;
  return Boolean(columnMeta && columnMeta.editable === false);
};

const resolveCellTabIndex = (
  isSelectedCell: boolean,
  focusInsideCell: boolean
): number => (isSelectedCell && !focusInsideCell ? 0 : -1);

const resolveEditableDescriptionId = (
  canEditCells: boolean,
  isReadOnlyCell: boolean
): string | undefined =>
  canEditCells && !isReadOnlyCell
    ? "rowy-table-editable-cell-description"
    : undefined;

const toDataFlag = (flag: boolean): boolean | undefined =>
  flag ? true : undefined;

const getRowArrayIndex = (row: Row<TableRow>): number | undefined => {
  const arrayData = row.original._rowy_ref.arrayTableData;
  return arrayData ? arrayData.index : undefined;
};

const buildCellPositionStyle = (
  props: ITableCellProps
): React.CSSProperties => {
  const isActionCol = props.cell.column.id === "_rowy_column_actions";
  return {
    width: props.width,
    height: props.rowHeight,
    position: props.isPinned ? "sticky" : "absolute",
    left: props.left - (props.isPinned ? TABLE_PADDING : 0),
    backgroundColor: isActionCol ? "transparent" : undefined,
    borderBottomWidth: isActionCol ? 0 : undefined,
    borderRightWidth: isActionCol ? 0 : undefined,
  };
};

interface DragFillHandleProps {
  visible: boolean;
  onStartDrag: () => void;
}

const CellDragFillHandle = ({ visible, onStartDrag }: DragFillHandleProps) => {
  if (!visible) return null;
  return (
    <div
      className="cell-drag-fill-handle"
      data-testid="cell-drag-fill-handle"
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onStartDrag();
      }}
    />
  );
};

interface ContextMenuActionContext {
  event: React.MouseEvent<HTMLDivElement>;
  row: Row<TableRow>;
  columnId: string;
  setSelectedCell: ReturnType<typeof useSetAtom<typeof selectedCellAtom>>;
  setContextMenuTarget: ReturnType<
    typeof useSetAtom<typeof contextMenuTargetAtom>
  >;
}

const handleCellContextMenu = (ctx: ContextMenuActionContext) => {
  ctx.event.preventDefault();
  let isEditorCell = false;

  ctx.setSelectedCell((prev) => {
    isEditorCell = Boolean(prev && prev.focusInside === true);
    return {
      arrayIndex: getRowArrayIndex(ctx.row),
      path: ctx.row.original._rowy_ref.path,
      columnKey: ctx.columnId,
      focusInside: false,
    };
  });
  (ctx.event.target as HTMLDivElement).focus();
  if (!isEditorCell) {
    ctx.setContextMenuTarget(ctx.event.target as HTMLElement);
  }
};

interface HoverDragRangeContext {
  dragFillState: DragFillState | null;
  setDragFillState: (next: DragFillState) => void;
  columnId: string;
  rowIndex: number;
}

const updateHoverDragRange = (ctx: HoverDragRangeContext) => {
  if (!ctx.dragFillState || ctx.dragFillState.columnKey !== ctx.columnId) {
    return;
  }
  ctx.setDragFillState({ ...ctx.dragFillState, endRowIndex: ctx.rowIndex });
};

const shouldShowDragFillHandle = (
  props: ITableCellProps,
  canFill: boolean
): boolean => Boolean(props.isSelectedCell && !props.focusInsideCell && canFill);

export const TableCell = memo(function TableCell(props: ITableCellProps) {
  const { row, cell, index, isSelectedCell, focusInsideCell } = props;
  const setSelectedCell = useSetAtom(selectedCellAtom, tableScope);
  const setContextMenuTarget = useSetAtom(contextMenuTargetAtom, tableScope);
  const [dragFillState, setDragFillState] = useAtom(
    dragFillStateAtom,
    tableScope
  );

  const value = cell.getValue();
  const columnMeta = cell.column.columnDef.meta;
  const validation = evaluateCellValidation(columnMeta, value);
  const isDisabled = isCellReadOnly(props.canEditCells, columnMeta);

  const canFill = canColumnDragFill({
    canEditCells: props.canEditCells,
    isReadOnlyCell: props.isReadOnlyCell,
    columnMeta,
  });
  const isInDragFill = isCellInDragFillRange(dragFillState, {
    columnKey: cell.column.id,
    rowIndex: row.index,
  });

  const selectCurrentCell = (focusInside: boolean) =>
    setSelectedCell({
      arrayIndex: getRowArrayIndex(row),
      path: row.original._rowy_ref.path,
      columnKey: cell.column.id,
      focusInside,
    });

  const tableCellComponentProps: IRenderedTableCellProps = {
    ...cell.getContext(),
    value,
    focusInsideCell,
    setFocusInsideCell: selectCurrentCell,
    disabled: isDisabled,
    rowHeight: props.rowHeight,
  };

  return (
    <StyledCell
      key={cell.id}
      data-row-id={row.id}
      data-col-id={cell.column.id}
      data-frozen={cell.column.getIsPinned()}
      data-frozen-last={toDataFlag(props.isLastFrozen)}
      data-drag-fill={toDataFlag(isInDragFill)}
      role="gridcell"
      tabIndex={resolveCellTabIndex(isSelectedCell, focusInsideCell)}
      aria-colindex={index + 1}
      aria-readonly={isDisabled}
      aria-required={validation.required}
      aria-selected={isSelectedCell}
      aria-describedby={resolveEditableDescriptionId(
        props.canEditCells,
        props.isReadOnlyCell
      )}
      aria-invalid={validation.ariaInvalid}
      style={buildCellPositionStyle(props)}
      onMouseEnter={() =>
        updateHoverDragRange({
          dragFillState,
          setDragFillState,
          columnId: cell.column.id,
          rowIndex: row.index,
        })
      }
      onClick={(e) => {
        selectCurrentCell(false);
        (e.target as HTMLDivElement).focus();
      }}
      onDoubleClick={(e) => {
        selectCurrentCell(true);
        (e.target as HTMLDivElement).focus();
      }}
      onContextMenu={(event) =>
        handleCellContextMenu({
          event,
          row,
          columnId: cell.column.id,
          setSelectedCell,
          setContextMenuTarget,
        })
      }
    >
      {renderCellValidationTooltip(validation.isInvalid, validation.isMissing)}
      <ErrorBoundary fallbackRender={InlineErrorFallback}>
        {flexRender(cell.column.columnDef.cell, tableCellComponentProps)}
      </ErrorBoundary>
      <CellDragFillHandle
        visible={shouldShowDragFillHandle(props, canFill)}
        onStartDrag={() =>
          setDragFillState({
            columnKey: cell.column.id,
            startRowIndex: row.index,
            endRowIndex: row.index,
            sourceValue: value,
            sourcePath: row.original._rowy_ref.path,
          })
        }
      />
    </StyledCell>
  );
});

export default TableCell;
