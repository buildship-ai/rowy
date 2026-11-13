import { describe, it, expect } from "vitest";

import { computeFillRange, FILL_HANDLE_ATTRIBUTE } from "./useDragFill";

describe("computeFillRange", () => {
  it("returns an inclusive range when dragging downwards", () => {
    expect(computeFillRange("name", 2, 5)).toEqual({
      columnKey: "name",
      startIndex: 2,
      endIndex: 5,
    });
  });

  it("returns an inclusive range when dragging upwards", () => {
    expect(computeFillRange("name", 5, 2)).toEqual({
      columnKey: "name",
      startIndex: 2,
      endIndex: 5,
    });
  });

  it("returns a single-cell range when source and target are the same", () => {
    expect(computeFillRange("name", 3, 3)).toEqual({
      columnKey: "name",
      startIndex: 3,
      endIndex: 3,
    });
  });
});

describe("FILL_HANDLE_ATTRIBUTE", () => {
  it("is a data attribute used to locate the fill handle", () => {
    expect(FILL_HANDLE_ATTRIBUTE).toBe("data-fill-handle");
  });
});
