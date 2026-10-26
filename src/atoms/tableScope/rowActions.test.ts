import { useCallback } from "react";
import { renderHook, act } from "@testing-library/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import { find, findIndex, sortBy } from "lodash-es";

import { currentUserAtom } from "@src/atoms/projectScope";
import {
  tableScope,
  tableSettingsAtom,
  tableFiltersAtom,
  tableSortsAtom,
  tableRowsDbAtom,
  tableRowsLocalAtom,
  _updateRowDbAtom,
  _deleteRowDbAtom,
  addRowAtom,
  deleteRowAtom,
} from "@src/atoms/tableScope";
import { TableRow } from "@src/types/table";
import { tableRowsAtom } from "./table";
import { updateRowData, decrementId } from "@src/utils/table";

const TEST_COLLECTION = "_testing";

const initRows = (
  initialRowsDb: TableRow[] = [],
  initialRowsLocal: TableRow[] = [],
  enableAudit: boolean = false
) =>
  renderHook(async () => {
    const setCurrentUser = useSetAtom(currentUserAtom, tableScope);
    setCurrentUser({
      uid: "TEST_USER",
      displayName: "Test User",
      email: "test@example.com",
    } as any);

    const setTableSettings = useSetAtom(tableSettingsAtom, tableScope);
    setTableSettings({
      id: TEST_COLLECTION,
      name: TEST_COLLECTION,
      collection: TEST_COLLECTION,
      roles: ["ADMIN"],
      section: "",
      tableType: "primaryCollection",
      audit: enableAudit,
    });

    const setRowsDb = useSetAtom(tableRowsDbAtom, tableScope);
    setRowsDb([...initialRowsDb]);
    const readRowsDb = useAtomCallback(
      useCallback((get) => get(tableRowsDbAtom), []),
      tableScope
    );

    const setRowsLocal = useSetAtom(tableRowsLocalAtom, tableScope);
    setRowsLocal({ type: "set", rows: [...initialRowsLocal] });

    const setTableFilters = useSetAtom(tableFiltersAtom, tableScope);
    setTableFilters([]);

    const setTableSorts = useSetAtom(tableSortsAtom, tableScope);
    setTableSorts([]);

    const setUpdateRowDb = useSetAtom(_updateRowDbAtom, tableScope);
    setUpdateRowDb(() => async (path: string, update: Partial<TableRow>) => {
      setRowsDb((rows) => {
        const index = findIndex(rows, ["_rowy_ref.path", path]);

        // Append if not found and sort by ID
        if (index === -1) {
          return sortBy(
            [
              ...rows,
              { ...update, _rowy_ref: { id: path.split("/").pop()!, path } },
            ],
            ["_rowy_ref.id"]
          );
        }

        rows[index] = updateRowData(rows[index], update);
        return rows;
      });
      return Promise.resolve();
    });

    const setDeleteRowDb = useSetAtom(_deleteRowDbAtom, tableScope);
    setDeleteRowDb(() => async (path: string) => {
      const rows = await readRowsDb();
      const index = findIndex(rows, ["_rowy_ref.path", path]);
      if (index > -1) {
        rows.splice(index, 1);
        setRowsDb(rows);
      }
      return Promise.resolve();
    });
  });

const GENERATED_ROWS_LENGTH = 10;
const generatedRows = new Array(GENERATED_ROWS_LENGTH)
  .fill(undefined)
  .map((_, i) => ({
    _rowy_ref: { id: `row${i}`, path: TEST_COLLECTION + "/row" + i },
    index: i,
  }));
const generatedRowsLocal = new Array(GENERATED_ROWS_LENGTH)
  .fill(undefined)
  .map((_, i) => ({
    _rowy_ref: { id: `rowLocal${i}`, path: TEST_COLLECTION + "/rowLocal" + i },
    index: i,
  }));

describe("addRow", () => {
  describe("single", () => {
    test("adds a single row with pre-defined id", async () => {
      initRows(generatedRows);
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(() =>
        addRow({
          row: {
            _rowy_ref: { id: "addedRow", path: TEST_COLLECTION + "/addedRow" },
            added: true,
          },
        })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH + 1);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow"])?.added).toBe(true);
    });

    test("adds a single row with pre-defined id to an empty table", async () => {
      initRows();
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(() =>
        addRow({
          row: {
            _rowy_ref: { id: "addedRow", path: TEST_COLLECTION + "/addedRow" },
            added: true,
          },
        })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(1);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow"])?.added).toBe(true);
    });

    test("adds a single row and generates random id", async () => {
      initRows(generatedRows);
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(() =>
        addRow({
          row: {
            _rowy_ref: { id: "addedRow", path: TEST_COLLECTION + "/addedRow" },
            added: true,
          },
          setId: "random",
        })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH + 1);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow"])).toBeUndefined();
      expect(find(tableRows, ["added", true])).toBeDefined();
      expect(find(tableRows, ["added", true])?._rowy_ref.id).toHaveLength(20);
    });

    test("adds a single row and decrements id", async () => {
      initRows(generatedRows);
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(() =>
        addRow({
          row: {
            _rowy_ref: { id: "addedRow", path: TEST_COLLECTION + "/addedRow" },
            added: true,
          },
          setId: "decrement",
        })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH + 1);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow"])).toBeUndefined();
      expect(find(tableRows, ["added", true])).toBeDefined();
      expect(find(tableRows, ["added", true])?._rowy_ref.id).toBe(
        decrementId("row0")
      );
    });

    test("adds a single row with decrements id to an empty table", async () => {
      initRows([]);
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(() =>
        addRow({
          row: {
            _rowy_ref: { id: "addedRow", path: TEST_COLLECTION + "/addedRow" },
            added: true,
          },
          setId: "decrement",
        })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(1);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow"])).toBeUndefined();
      expect(find(tableRows, ["added", true])).toBeDefined();
      expect(find(tableRows, ["added", true])?._rowy_ref.id).toBe(
        decrementId()
      );
    });
  });

  // TODO: NESTED FIELDS TESTS
  // TODO: TEST _rowy_* fields are removed

  describe("multiple", () => {
    test("adds multiple rows with pre-defined id", async () => {
      initRows(generatedRows);
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(
        async () =>
          await addRow({
            row: [
              {
                _rowy_ref: {
                  id: "addedRow0",
                  path: TEST_COLLECTION + "/addedRow0",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow1",
                  path: TEST_COLLECTION + "/addedRow1",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow2",
                  path: TEST_COLLECTION + "/addedRow2",
                },
                added: true,
              },
            ],
          })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH + 3);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow0"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow0"])?.added).toBe(true);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow1"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow1"])?.added).toBe(true);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow2"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow2"])?.added).toBe(true);
    });

    test("adds multiple rows with pre-defined id to an empty table", async () => {
      initRows();
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(
        async () =>
          await addRow({
            row: [
              {
                _rowy_ref: {
                  id: "addedRow0",
                  path: TEST_COLLECTION + "/addedRow0",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow1",
                  path: TEST_COLLECTION + "/addedRow1",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow2",
                  path: TEST_COLLECTION + "/addedRow2",
                },
                added: true,
              },
            ],
          })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(3);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow0"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow0"])?.added).toBe(true);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow1"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow1"])?.added).toBe(true);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow2"])).toBeDefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow2"])?.added).toBe(true);
    });

    test("adds multiple rows and generates random id", async () => {
      initRows(generatedRows);
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(
        async () =>
          await addRow({
            row: [
              {
                _rowy_ref: {
                  id: "addedRow0",
                  path: TEST_COLLECTION + "/addedRow0",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow1",
                  path: TEST_COLLECTION + "/addedRow1",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow2",
                  path: TEST_COLLECTION + "/addedRow2",
                },
                added: true,
              },
            ],
            setId: "random",
          })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH + 3);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow0"])).toBeUndefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow1"])).toBeUndefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow2"])).toBeUndefined();
      expect(find(tableRows, ["added", true])).toBeDefined();
      expect(find(tableRows, ["added", true])?._rowy_ref.id).toHaveLength(20);
    });

    test("adds multiple rows and decrements id", async () => {
      initRows(generatedRows);
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(
        async () =>
          await addRow({
            row: [
              {
                _rowy_ref: {
                  id: "addedRow0",
                  path: TEST_COLLECTION + "/addedRow0",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow1",
                  path: TEST_COLLECTION + "/addedRow1",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow2",
                  path: TEST_COLLECTION + "/addedRow2",
                },
                added: true,
              },
            ],
            setId: "decrement",
          })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH + 3);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow0"])).toBeUndefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow1"])).toBeUndefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow2"])).toBeUndefined();
      expect(find(tableRows, ["added", true])).toBeDefined();
      expect(find(tableRows, ["added", true])?._rowy_ref.id).toBe(
        decrementId(decrementId(decrementId("row0")))
      );
    });

    test("adds multiple rows and decrements id to an empty table", async () => {
      initRows();
      const {
        result: { current: addRow },
      } = renderHook(() => useSetAtom(addRowAtom, tableScope));
      expect(addRow).toBeDefined();

      await act(
        async () =>
          await addRow({
            row: [
              {
                _rowy_ref: {
                  id: "addedRow0",
                  path: TEST_COLLECTION + "/addedRow0",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow1",
                  path: TEST_COLLECTION + "/addedRow1",
                },
                added: true,
              },
              {
                _rowy_ref: {
                  id: "addedRow2",
                  path: TEST_COLLECTION + "/addedRow2",
                },
                added: true,
              },
            ],
            setId: "decrement",
          })
      );

      const {
        result: { current: tableRows },
      } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
      expect(tableRows).toHaveLength(3);
      expect(find(tableRows, ["_rowy_ref.id", "addedRow0"])).toBeUndefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow1"])).toBeUndefined();
      expect(find(tableRows, ["_rowy_ref.id", "addedRow2"])).toBeUndefined();
      expect(find(tableRows, ["added", true])).toBeDefined();
      expect(find(tableRows, ["added", true])?._rowy_ref.id).toBe(
        decrementId(decrementId(decrementId()))
      );
    });
  });
});

describe("deleteRow", () => {
  test("deletes a single row", async () => {
    initRows(generatedRows);
    const {
      result: { current: deleteRow },
    } = renderHook(() => useSetAtom(deleteRowAtom, tableScope));
    expect(deleteRow).toBeDefined();

    await act(() =>
      deleteRow({
        path: TEST_COLLECTION + "/row2",
      })
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH - 1);
    expect(find(tableRows, ["_rowy_ref.id", "row2"])).toBeFalsy();
  });

  test("deletes a single local row", async () => {
    initRows(generatedRows, generatedRowsLocal);
    const {
      result: { current: deleteRow },
    } = renderHook(() => useSetAtom(deleteRowAtom, tableScope));
    expect(deleteRow).toBeDefined();

    await act(() =>
      deleteRow({
        path: TEST_COLLECTION + "/rowLocal2",
      })
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH * 2 - 1);
    expect(find(tableRows, ["_rowy_ref.id", "rowLocal2"])).toBeFalsy();
  });

  test("deletes multiple rows", async () => {
    initRows(generatedRows);
    const {
      result: { current: deleteRow },
    } = renderHook(() => useSetAtom(deleteRowAtom, tableScope));
    expect(deleteRow).toBeDefined();

    await act(() =>
      deleteRow({
        path: ["row1", "row2", "row8"].map((id) => TEST_COLLECTION + "/" + id),
      })
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH - 3);
    expect(find(tableRows, ["_rowy_ref.id", "row1"])).toBeFalsy();
    expect(find(tableRows, ["_rowy_ref.id", "row2"])).toBeFalsy();
    expect(find(tableRows, ["_rowy_ref.id", "row8"])).toBeFalsy();
  });

  test("deletes all rows", async () => {
    initRows(generatedRows);
    const {
      result: { current: deleteRow },
    } = renderHook(() => useSetAtom(deleteRowAtom, tableScope));
    expect(deleteRow).toBeDefined();

    await act(() =>
      deleteRow({
        path: generatedRows.map((row) => row._rowy_ref.path),
      })
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(0);
  });

  test("doesn't delete a row that doesn't exist", async () => {
    initRows(generatedRows);
    const {
      result: { current: deleteRow },
    } = renderHook(() => useSetAtom(deleteRowAtom, tableScope));
    expect(deleteRow).toBeDefined();

    await act(() =>
      deleteRow({
        path: "nonExistent",
      })
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH);
  });

  test("doesn't delete from empty rows", async () => {
    initRows();
    const {
      result: { current: deleteRow },
    } = renderHook(() => useSetAtom(deleteRowAtom, tableScope));
    expect(deleteRow).toBeDefined();

    await act(() =>
      deleteRow({
        path: "nonExistent",
      })
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(0);
  });
});

describe("tableRowsAtom", () => {
  test("includes out of order rows when no filters or sorts are applied", () => {
    initRows(generatedRows, generatedRowsLocal);

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH * 2);
    expect(find(tableRows, ["_rowy_ref.id", "rowLocal0"])).toBeDefined();
  });

  test("excludes out of order rows when filters are applied", () => {
    initRows(generatedRows, generatedRowsLocal);
    const {
      result: { current: setTableFilters },
    } = renderHook(() => useSetAtom(tableFiltersAtom, tableScope));

    act(() =>
      setTableFilters([
        { id: "filter1", key: "index", operator: "==", value: 0 },
      ])
    );

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH);
    expect(find(tableRows, ["_rowy_ref.id", "rowLocal0"])).toBeUndefined();
  });

  test("excludes out of order rows when sorts are applied", () => {
    initRows(generatedRows, generatedRowsLocal);
    const {
      result: { current: setTableSorts },
    } = renderHook(() => useSetAtom(tableSortsAtom, tableScope));

    act(() => setTableSorts([{ key: "index", direction: "asc" }]));

    const {
      result: { current: tableRows },
    } = renderHook(() => useAtomValue(tableRowsAtom, tableScope));
    expect(tableRows).toHaveLength(GENERATED_ROWS_LENGTH);
    expect(find(tableRows, ["_rowy_ref.id", "rowLocal0"])).toBeUndefined();
  });
});
