import {
  getBoundedTableTimeout,
  MAX_TABLE_ANIMATION_TIMEOUT_MS,
} from "./TableGrid";

describe("getBoundedTableTimeout (#1531)", () => {
  test("computes staggered enter timeout for small table indices", () => {
    expect(getBoundedTableTimeout(0, 0)).toBe(50);
    expect(getBoundedTableTimeout(0, 2)).toBe(100);
    expect(getBoundedTableTimeout(1, 1)).toBe(125);
  });

  test("caps animation timeout at MAX_TABLE_ANIMATION_TIMEOUT_MS for large table counts", () => {
    expect(getBoundedTableTimeout(0, 170)).toBe(MAX_TABLE_ANIMATION_TIMEOUT_MS);
    expect(getBoundedTableTimeout(15, 170)).toBe(
      MAX_TABLE_ANIMATION_TIMEOUT_MS
    );
  });
});
