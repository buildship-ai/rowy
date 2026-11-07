import { renderHook, act } from "@testing-library/react";
import { useAtomValue, useSetAtom } from "jotai";

import {
  tableScope,
  tableRowsDbAtom,
  tableRowsLocalAtom,
  tableFiltersAtom,
  tableFiltersJoinAtom,
  tableSortsAtom,
  tableRowsAtom,
} from "@src/atoms/tableScope";
import { TableFilter, TableRow, TableSort } from "@src/types/table";

const COLLECTION = "_testing_table";

interface TableAtomSeedState {
  rowsDb?: TableRow[];
  rowsLocal?: TableRow[];
  filters?: TableFilter[];
  joinOperator?: "AND" | "OR";
  sorts?: TableSort[];
}

// Reset and seed Jotai tableScope atoms before asserting derived tableRowsAtom state.
const seedTableScopeAtoms = (seed: TableAtomSeedState = {}) =>
  renderHook(() => {
    const setRowsDb = useSetAtom(tableRowsDbAtom, tableScope);
    const setRowsLocal = useSetAtom(tableRowsLocalAtom, tableScope);
    const setFilters = useSetAtom(tableFiltersAtom, tableScope);
    const setJoinOperator = useSetAtom(tableFiltersJoinAtom, tableScope);
    const setSorts = useSetAtom(tableSortsAtom, tableScope);

    act(() => {
      setRowsDb(seed.rowsDb ? [...seed.rowsDb] : []);
      setRowsLocal({
        type: "set",
        rows: seed.rowsLocal ? [...seed.rowsLocal] : [],
      });
      setFilters(seed.filters ? [...seed.filters] : []);
      setJoinOperator(seed.joinOperator ?? "AND");
      setSorts(seed.sorts ? [...seed.sorts] : []);
    });
  });

const dbRowsFixture: TableRow[] = [
  {
    _rowy_ref: { id: "db1", path: `${COLLECTION}/db1` },
    percentage: 0.1,
    rank: 20,
  },
  {
    _rowy_ref: { id: "db2", path: `${COLLECTION}/db2` },
    percentage: 0.1,
    rank: 10,
  },
];

const outOfOrderLocalRowsFixture: TableRow[] = [
  {
    _rowy_ref: { id: "local1", path: `${COLLECTION}/local1` },
    percentage: 0,
    rank: 99,
    _rowy_outOfOrder: true,
  },
  {
    _rowy_ref: { id: "local2", path: `${COLLECTION}/local2` },
    percentage: 0,
    rank: 50,
    _rowy_outOfOrder: false,
  },
];

describe("tableRowsAtom with filters and sorts (#1527)", () => {
  test("prepends out-of-order local rows when no filters or sorts are active", () => {
    seedTableScopeAtoms({
      rowsDb: dbRowsFixture,
      rowsLocal: outOfOrderLocalRowsFixture,
    });

    const { result } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(result.current.map((r) => r._rowy_ref.id)).toEqual([
      "local1",
      "local2",
      "db1",
      "db2",
    ]);
  });

  test("excludes out-of-order local rows when table filters are active", () => {
    seedTableScopeAtoms({
      rowsDb: dbRowsFixture,
      rowsLocal: outOfOrderLocalRowsFixture,
      filters: [{ key: "percentage", operator: "==", value: 0.1 }],
    });

    const { result } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(result.current).toHaveLength(dbRowsFixture.length);
    expect(result.current.map((r) => r._rowy_ref.id)).toEqual(["db1", "db2"]);
  });

  test("excludes locally edited db rows that no longer satisfy active filters", () => {
    seedTableScopeAtoms({
      rowsDb: dbRowsFixture,
      rowsLocal: [
        ...outOfOrderLocalRowsFixture,
        {
          _rowy_ref: { id: "db1", path: `${COLLECTION}/db1` },
          percentage: 0,
        },
      ],
      filters: [{ key: "percentage", operator: "==", value: 0.1 }],
    });

    const { result } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(result.current.map((r) => r._rowy_ref.id)).toEqual(["db2"]);
  });

  test("preserves sort ordering and excludes out-of-order rows when sorts are active", () => {
    seedTableScopeAtoms({
      rowsDb: [dbRowsFixture[1], dbRowsFixture[0]],
      rowsLocal: [
        ...outOfOrderLocalRowsFixture,
        {
          _rowy_ref: { id: "db2", path: `${COLLECTION}/db2` },
          rank: 30,
        },
      ],
      sorts: [{ key: "rank", direction: "asc" }],
    });

    const { result } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(result.current.map((r) => r._rowy_ref.id)).toEqual(["db1", "db2"]);
    expect(result.current.map((r) => r.rank)).toEqual([20, 30]);
  });
});
