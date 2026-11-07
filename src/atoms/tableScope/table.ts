import { atom } from "jotai";
import { atomWithReducer, atomWithHash } from "jotai/utils";
import { findIndex, cloneDeep, unset, orderBy, get as _get } from "lodash-es";

import {
  TableSettings,
  TableSchema,
  ColumnConfig,
  TableFilter,
  TableSort,
  TableRow,
  UpdateDocFunction,
  UpdateCollectionDocFunction,
  DeleteCollectionDocFunction,
  NextPageState,
  BulkWriteFunction,
} from "@src/types/table";
import { updateRowData } from "@src/utils/table";
import { Table } from "@tanstack/react-table";

/** Root atom from which others are derived */
export const tableIdAtom = atom("");
/** Store tableSettings from project settings document */
export const tableSettingsAtom = atom<TableSettings>({
  id: "",
  collection: "",
  name: "",
  roles: [],
  section: "",
  tableType: "primaryCollection",
});
/** Store tableSchema from schema document */
export const tableSchemaAtom = atom<TableSchema>({});
/** Store function to update tableSchema */
export const updateTableSchemaAtom = atom<
  UpdateDocFunction<TableSchema> | undefined
>(undefined);
/**
 * Store the table columns as an ordered array.
 * Puts frozen columns at the start, then sorts by ascending index.
 */
export const tableColumnsOrderedAtom = atom<ColumnConfig[]>((get) => {
  const tableSchema = get(tableSchemaAtom);
  if (!tableSchema || !tableSchema.columns) return [];
  return orderBy(
    Object.values(tableSchema.columns),
    [(c) => Boolean(c.fixed), "index"],
    ["desc", "asc"]
  );
});
/** Store the table */
export const reactTableAtom = atom<Table<TableRow> | null>(null);
/** Reducer function to convert from array of columns to columns object */
export const tableColumnsReducer = (
  a: Record<string, ColumnConfig>,
  c: ColumnConfig,
  index: number
) => {
  a[c.key] = { ...c, index };
  return a;
};

/** Filters applied to the local view */
export const tableFiltersAtom = atom<TableFilter[]>([]);
/** Join operator applied to mulitple filters */
export const tableFiltersJoinAtom = atom<"AND" | "OR">("AND");
/** Sorts applied to the local view */
export const tableSortsAtom = atom<TableSort[]>([]);

/** Store current page in URL */
export const tablePageHashAtom = atomWithHash("page", 0, {
  replaceState: true,
});
/**
 * Set the page for the table query. Stops updating if we’ve loaded all rows.
 */
export const tablePageAtom = atom(
  (get) => get(tablePageHashAtom),
  (get, set, update: number | ((p: number) => number)) => {
    const tableNextPage = get(tableNextPageAtom);
    if (tableNextPage.loading || !tableNextPage.available) return;

    const currentPage = get(tablePageHashAtom);
    set(
      tablePageHashAtom,
      typeof update === "number" ? update : update(currentPage)
    );
  }
);

type TableRowsLocalAction =
  /** Overwrite all rows */
  | { type: "set"; rows: TableRow[] }
  /** Add a row or multiple rows */
  | { type: "add"; row: TableRow | TableRow[] }
  /** Update a row */
  | {
      type: "update";
      path: string;
      row: Partial<TableRow>;
      deleteFields?: string[];
    }
  /** Delete a row or multiple rows */
  | { type: "delete"; path: string | string[] };

const updateExistingLocalRow = (
  prev: TableRow[],
  action: Extract<TableRowsLocalAction, { type: "update" }>
): TableRow[] => {
  const index = findIndex(prev, ["_rowy_ref.path", action.path]);
  if (index === -1) {
    return [
      {
        ...action.row,
        _rowy_ref: {
          path: action.path,
          id: action.path.split("/").pop() || action.path,
        },
      },
      ...prev,
    ];
  }

  const updatedRows = [...prev];
  updatedRows[index] = cloneDeep(prev[index]);
  if (Array.isArray(action.deleteFields)) {
    for (const field of action.deleteFields) {
      unset(updatedRows[index], field);
    }
  }
  updatedRows[index] = updateRowData(updatedRows[index], action.row);
  return updatedRows;
};

const deleteLocalRowsByPath = (
  prev: TableRow[],
  targetPath: string | string[]
): TableRow[] =>
  prev.filter((row) =>
    Array.isArray(targetPath)
      ? !targetPath.includes(row._rowy_ref.path)
      : row._rowy_ref.path !== targetPath
  );

const tableRowsLocalReducer = (
  prev: TableRow[],
  action: TableRowsLocalAction
): TableRow[] => {
  if (action.type === "set") return [...action.rows];
  if (action.type === "add") {
    return Array.isArray(action.row)
      ? [...action.row, ...prev]
      : [action.row, ...prev];
  }
  if (action.type === "update") return updateExistingLocalRow(prev, action);
  if (action.type === "delete") return deleteLocalRowsByPath(prev, action.path);
  throw new Error("Invalid action");
};
/**
 * Store rows that are out of order or not ready to be written to the db.
 * See {@link TableRowsLocalAction} for reducer actions.
 */
export const tableRowsLocalAtom = atomWithReducer(
  [] as TableRow[],
  tableRowsLocalReducer
);

/** Store rows from the db listener */
export const tableRowsDbAtom = atom<TableRow[]>([]);

type FilterPredicate = (cellValue: any, filterValue: any) => boolean;

const isEmptyCellValue = (val: any): boolean =>
  val === "" || val === undefined || val === null;

// Declarative operator map for evaluating active table filters against merged rows.
const FILTER_PREDICATES: Record<string, FilterPredicate> = {
  "==": (cell, target) => cell === target,
  "id-equal": (cell, target) => cell === target,
  "!=": (cell, target) => cell !== target,
  "<": (cell, target) => cell < target,
  "<=": (cell, target) => cell <= target,
  ">": (cell, target) => cell > target,
  ">=": (cell, target) => cell >= target,
  "is-empty": (cell) => isEmptyCellValue(cell),
  "is-not-empty": (cell) => !isEmptyCellValue(cell),
  in: (cell, target) => Array.isArray(target) && target.includes(cell),
  "not-in": (cell, target) => Array.isArray(target) && !target.includes(cell),
  "array-contains": (cell, target) => {
    const item = Array.isArray(target) ? target[0] : target;
    return Array.isArray(cell) && cell.includes(item);
  },
  "array-contains-any": (cell, target) =>
    Array.isArray(cell) &&
    Array.isArray(target) &&
    target.some((item) => cell.includes(item)),
};

const evaluateSingleFilter = (row: TableRow, filter: TableFilter): boolean => {
  const predicate = FILTER_PREDICATES[filter.operator];
  if (!predicate) return true;
  const cellValue =
    filter.operator === "id-equal" ? row._rowy_ref.id : _get(row, filter.key);
  return predicate(cellValue, filter.value);
};

interface RowFilterEvaluationContext {
  filters: TableFilter[];
  joinOperator: "AND" | "OR";
}

const matchesActiveFilters = (
  row: TableRow,
  context: RowFilterEvaluationContext
): boolean => {
  if (context.filters.length === 0) return true;
  return context.joinOperator === "OR"
    ? context.filters.some((f) => evaluateSingleFilter(row, f))
    : context.filters.every((f) => evaluateSingleFilter(row, f));
};

// Merge local rows ahead of database rows when no active filters or sorts
// constrain the Firestore snapshot.
const mergeUnconstrainedTableRows = (
  rowsDb: TableRow[],
  rowsLocal: TableRow[]
): TableRow[] => {
  const rowsDbMap = new Map<string, number>();
  rowsDb.forEach((row, i) => rowsDbMap.set(row._rowy_ref.path, i));

  const rowsLocalToMerge = rowsLocal.map((row) => {
    if (!rowsDbMap.has(row._rowy_ref.path)) return row;
    const index = rowsDbMap.get(row._rowy_ref.path)!;
    const merged = updateRowData({ ...rowsDb[index] }, row);
    rowsDbMap.delete(row._rowy_ref.path);
    return merged;
  });

  return [
    ...rowsLocalToMerge,
    ...rowsDb.filter((row) => rowsDbMap.has(row._rowy_ref.path)),
  ];
};

interface ConstrainedRowMergeContext {
  rowsDb: TableRow[];
  rowsLocal: TableRow[];
  filters: TableFilter[];
  joinOperator: "AND" | "OR";
  sorts: TableSort[];
}

// When filters or sorts are active, exclude unpersisted/out-of-order rows not
// returned by Firestore so row counts match serverDocCountAtom and sort/filter
// invariants remain intact.
const mergeConstrainedTableRows = (
  context: ConstrainedRowMergeContext
): TableRow[] => {
  const localByPath = new Map<string, TableRow>();
  for (const localRow of context.rowsLocal) {
    localByPath.set(localRow._rowy_ref.path, localRow);
  }

  let hasLocalOverrides = false;
  const mergedDbRows = context.rowsDb
    .map((dbRow) => {
      const localOverride = localByPath.get(dbRow._rowy_ref.path);
      if (!localOverride) return dbRow;
      hasLocalOverrides = true;
      return updateRowData({ ...dbRow }, localOverride);
    })
    .filter((row) =>
      matchesActiveFilters(row, {
        filters: context.filters,
        joinOperator: context.joinOperator,
      })
    );

  if (!hasLocalOverrides || context.sorts.length === 0) return mergedDbRows;

  return orderBy(
    mergedDbRows,
    context.sorts.map((s) => s.key),
    context.sorts.map((s) => s.direction)
  );
};

/** Combine tableRowsLocal and tableRowsDb */
export const tableRowsAtom = atom<TableRow[]>((get) => {
  const rowsDb = get(tableRowsDbAtom);
  const rowsLocal = get(tableRowsLocalAtom);
  const filters = get(tableFiltersAtom);
  const sorts = get(tableSortsAtom);

  if (filters.length === 0 && sorts.length === 0) {
    return mergeUnconstrainedTableRows(rowsDb, rowsLocal);
  }

  return mergeConstrainedTableRows({
    rowsDb,
    rowsLocal,
    filters,
    joinOperator: get(tableFiltersJoinAtom),
    sorts,
  });
});

/** Store next page state for infinite scroll */
export const tableNextPageAtom = atom({
  loading: false,
  available: true,
} as NextPageState);

/**
 * Store function to add or update row in db directly.
 * Has same behaviour as Firestore setDoc with merge.
 * @see
 * - {@link updateRowData} implementation
 * - https://stackoverflow.com/a/47554197/3572007
 * @internal Use {@link addRowAtom} or {@link updateRowAtom} instead
 */
export const _updateRowDbAtom = atom<UpdateCollectionDocFunction | undefined>(
  undefined
);
/**
 * Store function to delete row in db directly
 * @internal Use {@link deleteRowAtom} instead
 */
export const _deleteRowDbAtom = atom<DeleteCollectionDocFunction | undefined>(
  undefined
);
/**
 * Store function to bulk write to db
 * @internal Use {@link bulkAddRowsAtom} instead
 */
export const _bulkWriteDbAtom = atom<BulkWriteFunction | undefined>(undefined);

export type AuditChangeFunction = (
  type: "ADD_ROW" | "UPDATE_CELL" | "DELETE_ROW",
  rowId: string,
  data?:
    | {
        updatedField?: string | undefined;
      }
    | undefined
) => Promise<any>;
/**
 * Store function to write auditing logs when user makes changes to the table.
 * Silently fails if auditing is disabled for the table or Rowy Run version
 * not compatible.
 *
 * @param type - Action type: "ADD_ROW" | "UPDATE_CELL" | "DELETE_ROW"
 * @param rowId - ID of row updated
 * @param data - Optional additional data to log
 */
export const auditChangeAtom = atom<AuditChangeFunction | undefined>(undefined);

/**
 * Store total number of rows in the table, respecting current filters.
 * If `undefined`, the query hasn’t loaded yet.
 */
export const serverDocCountAtom = atom<number | undefined>(undefined);
