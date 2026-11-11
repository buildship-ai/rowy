import {
  computeSectionAnimationTimeout,
  computeTableCardAnimationTimeout,
  EXIT_ANIMATION_TIMEOUT_MS,
  MAX_SECTION_ANIMATION_TIMEOUT_MS,
  MAX_TABLE_ANIMATION_TIMEOUT_MS,
} from "./TableGrid";

describe("TableGrid & TableList bounded search animation timeouts (#1531)", () => {
  it("caps section animation timeout at MAX_SECTION_ANIMATION_TIMEOUT_MS regardless of section count", () => {
    expect(computeSectionAnimationTimeout(0)).toBe(75);
    expect(computeSectionAnimationTimeout(1)).toBe(150);
    expect(computeSectionAnimationTimeout(25)).toBe(
      MAX_SECTION_ANIMATION_TIMEOUT_MS
    );
    expect(computeSectionAnimationTimeout(170)).toBe(
      MAX_SECTION_ANIMATION_TIMEOUT_MS
    );
  });

  it("caps table card enter/exit animation timeout at <= 350ms even with 170+ tables", () => {
    const first = computeTableCardAnimationTimeout(0, 0);
    expect(first).toEqual({ enter: 50, exit: EXIT_ANIMATION_TIMEOUT_MS });

    const table170 = computeTableCardAnimationTimeout(8, 170);
    expect(table170.enter).toBeLessThanOrEqual(MAX_TABLE_ANIMATION_TIMEOUT_MS);
    expect(table170.exit).toBe(EXIT_ANIMATION_TIMEOUT_MS);

    const table500 = computeTableCardAnimationTimeout(20, 500);
    expect(table500.enter).toBe(MAX_TABLE_ANIMATION_TIMEOUT_MS);
    expect(table500.exit).toBe(EXIT_ANIMATION_TIMEOUT_MS);
  });
});
