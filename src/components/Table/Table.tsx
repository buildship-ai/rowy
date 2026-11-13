import { useMemo, useRef, useState, useEffect, useCallback } from "react";
// import useStateRef from "react-usestateref"; // testing with useStateWithRef
import { useAtom, useSetAtom } from "jotai";
import { useThrottledCallback } from "use-debounce";
import {
  RowSelectionState,
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type {
  ColumnPinningState,
  VisibilityState,
} from "@tanstack/react-table";
import { DropResult } from "react-beautiful-dnd";
import { get } from "lodash-es";

import StyledTable from "./Styled/StyledTable";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import FinalColumn from "./FinalColumn/FinalColumn";
import ContextMenu from "./ContextMenu";
import EmptyState from "@src/components/EmptyState";
// import BulkActions from "./BulkActions";

import {
  tableScope,
  tableSchemaAtom,
  reactTableAtom,
  tableColumnsOrderedAtom,
  tableRowsAtom,
  tableNextPageAtom,
  tablePageAtom,
  updateColumnAtom,
  selectedCellAtom,
  tableSortsAtom,
  tableIdAtom,
  serverDocCountAtom,
} from "@src/atoms/tableScope";
import { projectScope, userSettingsAtom } from "@src/atoms/projectScope";
import { getFieldType, getFieldProp } from "@src/components/fields";
import { useKeyboardNavigation } from "./useKeyboardNavigation";
import { useMenuAction } from "./useMenuAction";
import { useDragFill } from "./useDragFill";
import { useSaveColumnSizing } from "./useSaveColumnSizing";
import useHotKeys from "./useHotKey";
import type { TableRow, ColumnConfig } from "@src/types/table";
import useStateWithRef from "./useStateWithRef"; // testing with useStateWithRef
import { Checkbox, FormControlLabel } from "@mui/material";

export const DEFAULT_ROW_HEIGHT = 41;
export const DEFAULT_COL_WIDTH = 150;
export const MIN_COL_WIDTH = 80;
export const TABLE_PADDING = 16;
export const OUT_OF_ORDER_MARGIN = 8;
export const DEBOUNCE_DELAY = 500;

declare module "@tanstack/table-core" {
  /** The `column.meta` property contains the column config from tableSchema */
  interface ColumnMeta<TData, TValue> extends ColumnConfig {}
}

const columnHelper = createColumnHelper<TableRow>();
const getRowId = (row: TableRow) => row._rowy_ref.path || row._rowy_ref.id;

export interface ITableProps {
  /** Determines if “Add column” button is displayed */
  canAddColumns: boolean;
  /** Determines if columns can be rearranged */
  canEditColumns: boolean;
  /**
   * Determines if any cell can be edited.
   * If false, `Table` only ever renders `EditorCell`.
   */
  canEditCells: boolean;
  /** The hidden columns saved to user settings */
  hiddenColumns?: string[];
  /**
   * Displayed when `tableRows` is empty.
   * Loading state handled by Suspense in parent component.
   */
  emptyState?: React.ReactNode;
  /**
   * If defined, it will show a checkbox to select rows. The
   * state is to be maintained by the parent component.
   *
   * Usage:
   *
   * const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
   * const selectedRowsProp = useMemo(() => ({state: selectedRows, setState: setSelectedRows}), [selectedRows, setSelectedRows])
   * <Table selectedRows={selectedRowsProp} />
   */
  selectedRows?: {
    state: RowSelectionState;
    setState: React.Dispatch<React.SetStateAction<{}>>;
  };
}

/**
 * Takes table schema and row data from `tableScope` and makes it compatible
 * with TanStack Table. Renders table children and cell context menu.
 *
 * - Calls `useKeyboardNavigation` hook
 * - Handles rearranging columns
 * - Handles infinite scrolling
 * - Stores local state for resizing columns, and asks admins if they want to
 *   save to table schema for all users
 */
export default function Table({
  canAddColumns,
  canEditColumns,
  canEditCells,
  hiddenColumns,
  emptyState,
  selectedRows,
}: ITableProps) {
  const [tableSchema] = useAtom(tableSchemaAtom, tableScope);
  const [serverDocCount] = useAtom(serverDocCountAtom, tableScope);
  const [tableColumnsOrdered] = useAtom(tableColumnsOrderedAtom, tableScope);
  const [tableRows] = useAtom(tableRowsAtom, tableScope);
  const [tableNextPage] = useAtom(tableNextPageAtom, tableScope);
  const [tablePage, setTablePage] = useAtom(tablePageAtom, tableScope);
  const setReactTable = useSetAtom(reactTableAtom, tableScope);

  const setSelectedCell = useSetAtom(selectedCellAtom, tableScope);
  const updateColumn = useSetAtom(updateColumnAtom, tableScope);

  // Get user settings and tableId for applying sort sorting
  const [userSettings] = useAtom(userSettingsAtom, projectScope);
  const [tableId] = useAtom(tableIdAtom, tableScope);
  const setTableSorts = useSetAtom(tableSortsAtom, tableScope);

  // Store a **state** and reference to the container element
  // so the state can re-render `TableBody`, preventing virtualization
  // not detecting scroll if the container element was initially `null`
  const [containerEl, setContainerEl, containerRef] =
    // useStateRef<HTMLDivElement | null>(null); // <-- older approach with useStateRef
    useStateWithRef<HTMLDivElement | null>(null); // <-- newer approach with custom hook

  const gridRef = useRef<HTMLDivElement>(null);

  // Get column defs from table schema
  // Also add end column for admins (canAddColumns || canEditCells)
  const columns = useMemo(() => {
    const _columns = tableColumnsOrdered
      // Hide column for all users using table schema
      .filter((column) => !column.hidden)
      .map((columnConfig) =>
        columnHelper.accessor((row) => get(row, columnConfig.fieldName), {
          id: columnConfig.fieldName,
          meta: columnConfig,
          size: columnConfig.width,
          enableResizing: columnConfig.resizable !== false,
          minSize: MIN_COL_WIDTH,
          cell: getFieldProp("TableCell", getFieldType(columnConfig)),
        })
      );

    if (canAddColumns || canEditCells) {
      _columns.push(
        columnHelper.display({
          id: "_rowy_column_actions",
          cell: FinalColumn as any,
        })
      );
    }

    return _columns;
  }, [tableColumnsOrdered, canAddColumns, canEditCells, selectedRows]);

  columns.unshift(
    ...useMemo(() => {
      if (!selectedRows) return [];

      return [
        columnHelper.display({
          id: "_rowy_select",
          size: 41.8, // TODO: We shouldn't have to change this often
          header: ({ table }) => {
            const checked =
              Object.keys(selectedRows.state).length >= serverDocCount!;
            const indeterminate = Object.keys(selectedRows.state).length > 0;
            return (
              <FormControlLabel
                sx={{ margin: 0 }}
                label=""
                control={
                  <Checkbox
                    checked={checked}
                    indeterminate={indeterminate && !checked}
                    onChange={() => {
                      table.toggleAllRowsSelected(
                        !table.getIsAllRowsSelected()
                      );
                    }}
                  />
                }
              />
            );
          },
          cell: ({ row }) => {
            return (
              <FormControlLabel
                label=""
                sx={{ margin: 0 }}
                control={
                  <Checkbox
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                  />
                }
              />
            );
          },
        }),
      ];
    }, [selectedRows])
  );

  // Get user’s hidden columns from props and memoize into a `VisibilityState`
  const columnVisibility: VisibilityState = useMemo(() => {
    if (!Array.isArray(hiddenColumns)) return {};
    return hiddenColumns.reduce((a, c) => ({ ...a, [c]: false }), {});
  }, [hiddenColumns]);

  const columnPinning: ColumnPinningState = useMemo(
    () => ({
      left: [
        ...(selectedRows ? ["_rowy_select"] : []),
        ...columns
          .filter(
            (c) => c.meta?.fixed && c.id && columnVisibility[c.id] !== false
          )
          .map((c) => c.id!),
      ],
    }),
    [columns, columnVisibility]
  );
  const lastFrozen: string | undefined =
    columnPinning.left![columnPinning.left!.length - 1];

  // Call TanStack Table
  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    columnResizeMode: "onChange",
    ...(selectedRows && {
      enableRowSelection: true,
      enableMultiRowSelection: true,
      state: {
        rowSelection: selectedRows.state,
      },
      onRowSelectionChange: selectedRows.setState,
    }),
  });

  // Store local `columnSizing` state so we can save it to table schema
  // in `useSaveColumnSizing`. This could be generalized by storing the
  // entire table state.
  const [columnSizing, setColumnSizing] = useState(
    table.initialState.columnSizing
  );
  table.setOptions((prev) => ({
    ...prev,
    state: { ...prev.state, columnVisibility, columnPinning, columnSizing },
    onColumnSizingChange: setColumnSizing,
  }));
  // Update the reactTable atom when table state changes.
  useMemo(() => {
    setReactTable(table);
  }, [table, setReactTable]);
  // Get rows and columns for virtualization
  const { rows } = table.getRowModel();
  const leafColumns = table.getVisibleLeafColumns();

  // Handle keyboard navigation
  const { handleKeyDown } = useKeyboardNavigation({
    gridRef,
    tableRows,
    leafColumns,
  });
  const [selectedCell] = useAtom(selectedCellAtom, tableScope);
  const { handleCopy, handlePaste, handleCut } = useMenuAction(selectedCell);
  useDragFill({ canEditCells });
  const { handler: hotKeysHandler } = useHotKeys([
    ["mod+C", handleCopy],
    ["mod+X", handleCut],
    ["mod+V", (e) => handlePaste], // So the event isn't passed to the handler
  ]);

  // Handle prompt to save local column sizes if user `canEditColumns`
  useSaveColumnSizing(columnSizing, canEditColumns);

  const handleDropColumn = useCallback(
    (result: DropResult) => {
      if (result.destination?.index === undefined || !result.draggableId)
        return;

      updateColumn({
        key: result.draggableId,
        index: selectedRows
          ? result.destination.index - 1
          : result.destination.index,
        config: {},
      });
    },
    [updateColumn, selectedRows]
  );

  const fetchMoreOnBottomReached = useThrottledCallback(
    (containerElement?: HTMLDivElement | null) => {
      if (!containerElement) return;

      const { scrollHeight, scrollTop, clientHeight } = containerElement;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        // deselect cell on next page load
        setSelectedCell(null);
        setTablePage((p) => p + 1);
      }
    },
    DEBOUNCE_DELAY
  );
  // Check on mount and after fetch to see if the table is at the bottom
  // for large screen heights
  useEffect(() => {
    fetchMoreOnBottomReached(containerRef.current);
  }, [fetchMoreOnBottomReached, tableNextPage.loading, containerRef]);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  // apply user default sort on first render
  const [applySort, setApplySort] = useState(true);
  useEffect(() => {
    if (applySort && Object.keys(tableSchema).length) {
      const userDefaultSort = userSettings.tables?.[tableId]?.sorts || [];
      setTableSorts(
        userDefaultSort.length ? userDefaultSort : tableSchema.sorts || []
      );
      setApplySort(false);
    }
  }, [tableSchema, userSettings, tableId, setTableSorts, applySort]);

  return (
    <div
      ref={(el) => {
        if (!el) return;
        setContainerEl(el);
      }}
      onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
      style={{ overflow: "auto", width: "100%", height: "100%" }}
    >
      <StyledTable
        ref={gridRef}
        role="grid"
        aria-readonly={!canEditCells}
        aria-colcount={columns.length}
        aria-rowcount={tableRows.length + 1}
        style={
          {
            width: table.getTotalSize(),
            userSelect: "none",
            "--row-height": `${tableSchema.rowHeight || DEFAULT_ROW_HEIGHT}px`,
          } as any
        }
        onKeyDown={(e) => {
          handleKeyDown(e);
          hotKeysHandler(e);
        }}
      >
        <div
          className="thead"
          role="rowgroup"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            padding: `0 ${TABLE_PADDING}px`,
          }}
        >
          <TableHeader
            headerGroups={table.getHeaderGroups()}
            handleDropColumn={handleDropColumn}
            canAddColumns={canAddColumns}
            canEditColumns={canEditColumns}
            lastFrozen={lastFrozen}
            columnSizing={columnSizing}
          />
        </div>

        {tableRows.length === 0 ? (
          emptyState ?? <EmptyState sx={{ py: 8 }} />
        ) : (
          <TableBody
            containerEl={containerEl}
            containerRef={containerRef}
            leafColumns={leafColumns}
            rows={rows}
            canEditCells={canEditCells}
            lastFrozen={lastFrozen}
            columnSizing={columnSizing}
          />
        )}
      </StyledTable>

      <div
        id="rowy-table-editable-cell-description"
        style={{ display: "none" }}
      >
        Press Enter to edit.
      </div>

      <ContextMenu />
    </div>
  );
}
