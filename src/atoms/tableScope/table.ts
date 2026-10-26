import { atom } from "jotai";
import { atomWithReducer, atomWithHash } from "jotai/utils";
import { findIndex, cloneDeep, unset, orderBy } from "lodash-es";

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
    Object.values(tableSchema?.columns ?? {}),
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
    // If loading more or doesn’t have next page, don’t request another page
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
const tableRowsLocalReducer = (
  prev: TableRow[],
  action: TableRowsLocalAction
): TableRow[] => {
  switch (action.type) {
    case "set":
      return [...action.rows];

    case "add":
      if (Array.isArray(action.row)) return [...action.row, ...prev];
      return [action.row, ...prev];

    case "update":
      const index = findIndex(prev, ["_rowy_ref.path", action.path]);
      if (index > -1) {
        const updatedRows = [...prev];
        updatedRows[index] = cloneDeep(prev[index]);
        if (Array.isArray(action.deleteFields)) {
          for (const field of action.deleteFields) {
            unset(updatedRows[index], field);
          }
        }
        updatedRows[index] = updateRowData(updatedRows[index], action.row);
        return updatedRows;
      }
      // If not found, add to start
      else {
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

    case "delete":
      return prev.filter((row) => {
        if (Array.isArray(action.path)) {
          return !action.path.includes(row._rowy_ref.path);
        } else {
          return row._rowy_ref.path !== action.path;
        }
      });

    default:
      throw new Error("Invalid action");
  }
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

/** Combine tableRowsLocal and tableRowsDb */
export const tableRowsAtom = atom<TableRow[]>((get) => {
  const rowsDb = get(tableRowsDbAtom);
  const rowsLocal = get(tableRowsLocalAtom);
  const tableFilters = get(tableFiltersAtom);
  const tableSorts = get(tableSortsAtom);

  if (tableFilters.length > 0 || tableSorts.length > 0) {
    return rowsDb;
  }

  // Optimization: create Map of rowsDb by path to index for faster lookup
  const rowsDbMap = new Map<string, number>();
  rowsDb.forEach((row, i) => rowsDbMap.set(row._rowy_ref.path, i));

  // Loop through rowsLocal, which is usually the smaller of the two arrays
  const rowsLocalToMerge = rowsLocal.map((row, i) => {
    // If row is in rowsDb, merge the two
    // and remove from rowsDb to prevent duplication
    if (rowsDbMap.has(row._rowy_ref.path)) {
      const index = rowsDbMap.get(row._rowy_ref.path)!;
      const merged = updateRowData({ ...rowsDb[index] }, row);
      rowsDbMap.delete(row._rowy_ref.path);
      return merged;
    }
    return row;
  });

  // Merge the two arrays
  return [
    ...rowsLocalToMerge,
    ...rowsDb.filter((row) => rowsDbMap.has(row._rowy_ref.path)),
  ];
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
