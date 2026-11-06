import { renderHook } from "@testing-library/react";
import { useAtomValue, useSetAtom } from "jotai";
import { describe, test, expect } from "vitest";

import {
  tableScope,
  tableRowsAtom,
  tableRowsDbAtom,
  tableRowsLocalAtom,
  tableFiltersAtom,
  tableSortsAtom,
} from "@src/atoms/tableScope";
import { TableRow, TableFilter, TableSort } from "@src/types/table";

const TEST_COLLECTION = "_testing";

const initTableAtoms = (
  initialRowsDb: TableRow[] = [],
  initialRowsLocal: TableRow[] = [],
  initialFilters: TableFilter[] = [],
  initialSorts: TableSort[] = []
) =>
  renderHook(() => {
    const setRowsDb = useSetAtom(tableRowsDbAtom, tableScope);
    const setRowsLocal = useSetAtom(tableRowsLocalAtom, tableScope);
    const setFilters = useSetAtom(tableFiltersAtom, tableScope);
    const setSorts = useSetAtom(tableSortsAtom, tableScope);

    setRowsDb([...initialRowsDb]);
    setRowsLocal({ type: "set", rows: [...initialRowsLocal] });
    setFilters([...initialFilters]);
    setSorts([...initialSorts]);
  });

describe("tableRowsAtom", () => {
  const dbRows: TableRow[] = [
    {
      _rowy_ref: { id: "row1", path: `${TEST_COLLECTION}/row1` },
      name: "Alice",
      age: 25,
    },
    {
      _rowy_ref: { id: "row2", path: `${TEST_COLLECTION}/row2` },
      name: "Bob",
      age: 30,
    },
  ];

  const localUnpersistedRow: TableRow = {
    _rowy_ref: { id: "rowNew", path: `${TEST_COLLECTION}/rowNew` },
    name: "Charlie",
    age: 35,
  };

  const localModifiedRow: TableRow = {
    _rowy_ref: { id: "row1", path: `${TEST_COLLECTION}/row1` },
    name: "Alice Updated",
  };

  test("includes unpersisted out-of-order local rows when no filters or sorts are applied", () => {
    initTableAtoms(dbRows, [localUnpersistedRow]);

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));

    expect(tableRows).toHaveLength(3);
    expect(tableRows[0]._rowy_ref.path).toBe(`${TEST_COLLECTION}/rowNew`);
    expect(tableRows[1]._rowy_ref.path).toBe(`${TEST_COLLECTION}/row1`);
    expect(tableRows[2]._rowy_ref.path).toBe(`${TEST_COLLECTION}/row2`);
  });

  test("merges local edits on existing db rows when no filters or sorts are applied", () => {
    initTableAtoms(dbRows, [localModifiedRow]);

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));

    expect(tableRows).toHaveLength(2);
    expect(tableRows[0]._rowy_ref.path).toBe(`${TEST_COLLECTION}/row1`);
    expect(tableRows[0].name).toBe("Alice Updated");
    expect(tableRows[0].age).toBe(25);
    expect(tableRows[1]._rowy_ref.path).toBe(`${TEST_COLLECTION}/row2`);
  });

  test("excludes unpersisted out-of-order local rows when filters are applied", () => {
    const filters: TableFilter[] = [
      {
        id: "filter1",
        key: "age",
        operator: "==",
        value: 25,
      },
    ];

    initTableAtoms(dbRows, [localUnpersistedRow, localModifiedRow], filters, []);

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));

    expect(tableRows).toHaveLength(2);
    expect(tableRows.find((r) => r._rowy_ref.id === "rowNew")).toBeUndefined();
    const row1 = tableRows.find((r) => r._rowy_ref.id === "row1");
    expect(row1).toBeDefined();
    expect(row1?.name).toBe("Alice Updated");
    expect(row1?.age).toBe(25);
    expect(tableRows.find((r) => r._rowy_ref.id === "row2")).toBeDefined();
  });

  test("excludes unpersisted out-of-order local rows when sorts are applied", () => {
    const sorts: TableSort[] = [
      {
        key: "name",
        direction: "asc",
      },
    ];

    initTableAtoms(dbRows, [localUnpersistedRow, localModifiedRow], [], sorts);

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));

    expect(tableRows).toHaveLength(2);
    expect(tableRows.find((r) => r._rowy_ref.id === "rowNew")).toBeUndefined();
    const row1 = tableRows.find((r) => r._rowy_ref.id === "row1");
    expect(row1).toBeDefined();
    expect(row1?.name).toBe("Alice Updated");
    expect(row1?.age).toBe(25);
  });

  test("excludes unpersisted local rows when both filters and sorts are applied", () => {
    const filters: TableFilter[] = [
      {
        id: "filter1",
        key: "name",
        operator: "==",
        value: "Alice",
      },
    ];
    const sorts: TableSort[] = [
      {
        key: "age",
        direction: "desc",
      },
    ];

    initTableAtoms(
      dbRows,
      [localUnpersistedRow, localModifiedRow],
      filters,
      sorts
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));

    expect(tableRows).toHaveLength(2);
    expect(tableRows.find((r) => r._rowy_ref.id === "rowNew")).toBeUndefined();
    expect(tableRows.find((r) => r._rowy_ref.id === "row1")?.name).toBe(
      "Alice Updated"
    );
  });
});
