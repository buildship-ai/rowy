import { render, screen, act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import SlideTransition from "@src/components/Modal/SlideTransition";
import TableGrid, {
  MAX_SECTION_TRANSITION_TIMEOUT_MS,
  MAX_TABLE_TRANSITION_TIMEOUT_MS,
} from "./TableGrid";
import TableList, {
  MAX_LIST_SECTION_TRANSITION_TIMEOUT_MS,
} from "@src/components/Tables/TableList/TableList";
import useBasicSearch from "@src/hooks/useBasicSearch";
import { TableSettings } from "@src/types/table";

const createSections = (count: number): Record<string, TableSettings[]> => {
  const sections: Record<string, TableSettings[]> = {};

  for (let i = 0; i < count; i++) {
    const section = `Section ${Math.floor(i / 20) + 1}`;
    if (!sections[section]) sections[section] = [];
    sections[section].push({
      id: `table_${i}`,
      collection: `table_${i}`,
      name: `Story ${i}`,
      description: `Description ${i}`,
      roles: ["ADMIN"],
      section,
      tableType: "primaryCollection",
    });
  }

  return sections;
};

describe("Table search animation and bounded transition timeouts (#1531)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("SlideTransition preserves fast exit duration when given numeric or enter-only timeout", () => {
    const spy = vi.spyOn(SlideTransition as any, "render");
    const sections = createSections(170);

    render(
      <MemoryRouter>
        <TableGrid sections={sections} getLink={(t) => `/table/${t.id}`} />
      </MemoryRouter>
    );

    expect(spy).toHaveBeenCalled();
    for (const [props] of spy.mock.calls) {
      const timeout = (props as { timeout?: { enter?: number; exit?: number } })
        .timeout;
      expect(timeout?.enter).toBeLessThanOrEqual(
        MAX_TABLE_TRANSITION_TIMEOUT_MS
      );
      expect(timeout?.enter).toBeGreaterThanOrEqual(50);
    }

    expect(
      screen.getByRole("heading", { name: "Story 169" })
    ).toBeInTheDocument();
  });

  test("SlideTransition completes exit within leavingScreen duration even when enter timeout is large", () => {
    const onExited = vi.fn();
    const { rerender } = render(
      <SlideTransition in timeout={500} onExited={onExited}>
        <div>Animated content</div>
      </SlideTransition>
    );

    rerender(
      <SlideTransition in={false} timeout={500} onExited={onExited}>
        <div>Animated content</div>
      </SlideTransition>
    );

    expect(onExited).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  test("TableList bounds section transition timeouts regardless of section count", () => {
    const spy = vi.spyOn(SlideTransition as any, "render");
    const sections = createSections(170);

    render(
      <MemoryRouter>
        <TableList sections={sections} getLink={(t) => `/table/${t.id}`} />
      </MemoryRouter>
    );

    expect(spy).toHaveBeenCalled();
    for (const [props] of spy.mock.calls) {
      const timeout = (props as { timeout?: { enter?: number } }).timeout;
      expect(timeout?.enter).toBeLessThanOrEqual(
        MAX_LIST_SECTION_TRANSITION_TIMEOUT_MS
      );
      expect(timeout?.enter).toBeLessThanOrEqual(
        MAX_SECTION_TRANSITION_TIMEOUT_MS
      );
    }
    expect(
      screen.getByRole("heading", { name: "Story 169" })
    ).toBeInTheDocument();
  });

  test("useBasicSearch filters 170 tables after 200ms debounce and memoizes results", () => {
    const tables = Object.values(createSections(170)).flat();
    const keys = ["id", "name", "section", "description"];
    const { result, rerender } = renderHook(() => useBasicSearch(tables, keys));

    const initialResults = result.current[0];
    expect(initialResults).toHaveLength(170);

    rerender();
    expect(result.current[0]).toBe(initialResults);

    act(() => {
      result.current[2]("Story 169");
    });
    expect(result.current[0]).toHaveLength(170);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current[1]).toBe("Story 169");
    expect(result.current[0]).toHaveLength(1);
    expect(result.current[0][0].name).toBe("Story 169");

    const filteredRef = result.current[0];
    rerender();
    expect(result.current[0]).toBe(filteredRef);
  });
});
