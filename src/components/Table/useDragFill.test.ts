import { FieldType } from "@src/constants/fields";
import type { ColumnConfig } from "@src/types/table";
import {
  canColumnDragFill,
  isCellInDragFillRange,
  resolveDragFillTargetRows,
} from "./useDragFill";

const buildColumnConfig = (
  type: FieldType,
  editable: boolean = true
): ColumnConfig => ({
  type,
  key: "col1",
  fieldName: "col1",
  name: "Column 1",
  index: 0,
  editable,
});

describe("useDragFill helpers (#533)", () => {
  test("isCellInDragFillRange matches rows within downward and upward drag bounds", () => {
    const dragDown = {
      columnKey: "title",
      startRowIndex: 1,
      endRowIndex: 4,
      sourceValue: "Hello",
      sourcePath: "_testing/row1",
    };

    expect(
      isCellInDragFillRange(dragDown, { columnKey: "title", rowIndex: 1 })
    ).toBe(true);
    expect(
      isCellInDragFillRange(dragDown, { columnKey: "title", rowIndex: 3 })
    ).toBe(true);
    expect(
      isCellInDragFillRange(dragDown, { columnKey: "title", rowIndex: 5 })
    ).toBe(false);
    expect(
      isCellInDragFillRange(dragDown, { columnKey: "other", rowIndex: 2 })
    ).toBe(false);
  });

  test("resolveDragFillTargetRows returns destination rows excluding source row", () => {
    const rows = ["r0", "r1", "r2", "r3", "r4"];
    const targets = resolveDragFillTargetRows(rows, {
      columnKey: "amount",
      startRowIndex: 1,
      endRowIndex: 3,
      sourceValue: 42,
      sourcePath: "_testing/row1",
    });

    expect(targets).toEqual(["r2", "r3"]);
  });

  test("canColumnDragFill enables text, number, and select fields while rejecting read-only columns", () => {
    expect(
      canColumnDragFill({
        canEditCells: true,
        isReadOnlyCell: false,
        columnMeta: buildColumnConfig(FieldType.shortText),
      })
    ).toBe(true);

    expect(
      canColumnDragFill({
        canEditCells: true,
        isReadOnlyCell: false,
        columnMeta: buildColumnConfig(FieldType.number),
      })
    ).toBe(true);

    expect(
      canColumnDragFill({
        canEditCells: true,
        isReadOnlyCell: true,
        columnMeta: buildColumnConfig(FieldType.createdBy),
      })
    ).toBe(false);

    expect(
      canColumnDragFill({
        canEditCells: false,
        isReadOnlyCell: false,
        columnMeta: buildColumnConfig(FieldType.shortText),
      })
    ).toBe(false);
  });
});
