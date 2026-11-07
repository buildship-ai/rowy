import { atom } from "jotai";
import { atomWithStorage, atomWithHash } from "jotai/utils";

import type { PopoverProps } from "@mui/material";
import type { ColumnConfig, TableFilter } from "@src/types/table";
import { SEVERITY_LEVELS } from "@src/components/TableModals/CloudLogsModal/CloudLogSeverityIcon";

/**
 * Open table column menu. Set to `null` to close.
 */
export const columnMenuAtom = atom<{
  column: ColumnConfig;
  anchorEl: PopoverProps["anchorEl"];
} | null>(null);

/**
 * Opens a table column modal. Set to `null` to close.
 * Modals: new column, name change, type change, column settings.
 */
export const columnModalAtom = atomWithHash<{
  type: "new" | "name" | "type" | "config" | "setColumnWidth";
  columnKey?: string;
  index?: number;
} | null>("columnModal", null, { replaceState: true });

export type TableFiltersPopoverState = {
  open: boolean;
  defaultQuery?: TableFilter;
};
/**
 * Store table filter popover state.
 * Calling the set function resets props.
 */
export const tableFiltersPopoverAtom = atom(
  { open: false } as TableFiltersPopoverState,
  (_, set, update?: Partial<TableFiltersPopoverState>) => {
    set(tableFiltersPopoverAtom, { open: true, ...update });
  }
);

/** Store whether to show hidden fields (override) in side drawer */
export const sideDrawerShowHiddenFieldsAtom = atomWithStorage(
  "__ROWY__SIDE_DRAWER_SHOW_HIDDEN_FIELDS",
  false
);

/**
 * Opens a table modal. Set to `null` to close.
 * Modals: cloud logs, extensions, webhooks, export, import, import CSV.
 */
export const tableModalAtom = atomWithHash<
  | "cloudLogs"
  | "extensions"
  | "webhooks"
  | "export"
  | "importExisting"
  | "importCsv"
  | "importAirtable"
  | null
>("tableModal", null, { replaceState: true });

export type ImportCsvData = { columns: string[]; rows: Record<string, any>[] };
export type ImportAirtableData = { records: Record<string, any>[] };

/** Store import CSV popover and wizard state */
export const importCsvAtom = atom<{
  importType: "csv" | "tsv" | "json";
  csvData: ImportCsvData | null;
}>({ importType: "csv", csvData: null });

/** Store import Airtable popover and wizard state */
export const importAirtableAtom = atom<{
  airtableData: ImportAirtableData | null;
  apiKey: string;
  baseId: string;
  tableId: string;
}>({ airtableData: null, apiKey: "", baseId: "", tableId: "" });

/** Store side drawer open state */
export const sideDrawerAtom = atomWithHash<"table-information" | null>(
  "sideDrawer",
  null,
  { replaceState: true }
);
/** Store side drawer open state */
export const sideDrawerOpenAtom = atom(false);

export type SelectedCell = {
  path: string | "_rowy_header";
  columnKey: string | "_rowy_row_actions";
  focusInside: boolean;
  arrayIndex?: number;
};
/** Store selected cell in table. Used in side drawer and context menu */
export const selectedCellAtom = atom<SelectedCell | null>(null);

/**
 * Track active drag-fill gesture across rows in the same column (#533).
 */
export type DragFillState = {
  columnKey: string;
  startRowIndex: number;
  endRowIndex: number;
  sourceValue: any;
  sourcePath: string;
};
export const dragFillStateAtom = atom<DragFillState | null>(null);

/** Store context menu target atom for positioning. If not null, menu open. */
export const contextMenuTargetAtom = atom<HTMLElement | null>(null);

export type CloudLogFilters = {
  type: "extension" | "webhook" | "column" | "audit" | "build" | "functions";
  timeRange:
    | { type: "seconds" | "minutes" | "hours" | "days"; value: number }
    | { type: "range"; start: Date; end: Date };
  severity?: Array<keyof typeof SEVERITY_LEVELS>;
  webhook?: string[];
  extension?: string[];
  column?: string[];
  auditRowId?: string;
  buildLogExpanded?: number;
  functionType?: (
    | "connector"
    | "derivative-script"
    | "action"
    | "derivative-function"
    | "extension"
    | "defaultValue"
    | "hooks"
  )[];
  loggingSource?: ("backend-scripts" | "backend-function" | "hooks")[];
};
/** Store cloud log modal filters in URL */
export const cloudLogFiltersAtom = atomWithHash<CloudLogFilters>(
  "cloudLogFilters",
  {
    type: "build",
    timeRange: { type: "days", value: 7 },
  },
  { replaceState: true }
);
