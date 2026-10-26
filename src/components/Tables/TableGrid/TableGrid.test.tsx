import { forwardRef } from "react";
import { render, renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import TableGrid from "./TableGrid";
import TableList from "@src/components/Tables/TableList";
import useBasicSearch from "@src/hooks/useBasicSearch";
import { TableSettings } from "@src/types/table";

const capturedTimeouts: Array<number | { enter?: number; exit?: number } | undefined> = [];

vi.mock("@src/components/Modal/SlideTransition", () => ({
  __esModule: true,
  default: forwardRef(function MockSlideTransition(
    { children, timeout }: any,
    ref: any
  ) {
    capturedTimeouts.push(timeout);
    return <div ref={ref}>{children}</div>;
  }),
}));

const createMockTables = (count: number, section = "Main"): TableSettings[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `table-${section}-${index}`,
    collection: `table_${section}_${index}`,
    name: index === count - 1 ? "Story Table" : `Table ${index}`,
    description: `Description ${index}`,
    roles: ["ADMIN"],
    section,
    tableType: "primaryCollection",
  }));

describe("Table search animation scaling (#1531)", () => {
  beforeEach(() => {
    capturedTimeouts.length = 0;
  });

  test("TableGrid uses a constant 50ms transition timeout across 170 tables", () => {
    const sections: Record<string, TableSettings[]> = {
      SectionA: createMockTables(85, "A"),
      SectionB: createMockTables(85, "B"),
    };

    render(
      <MemoryRouter>
        <TableGrid
          sections={sections}
          getLink={(table) => `/table/${table.id}`}
        />
      </MemoryRouter>
    );

    // 2 section headings + 170 table cards = 172 SlideTransitions
    expect(capturedTimeouts).toHaveLength(172);
    expect(capturedTimeouts.every((t) => t === 50)).toBe(true);
  });

  test("TableList uses a constant 50ms transition timeout across multiple sections", () => {
    const sections: Record<string, TableSettings[]> = {
      SectionA: createMockTables(20, "A"),
      SectionB: createMockTables(20, "B"),
      SectionC: createMockTables(20, "C"),
    };

    render(
      <MemoryRouter>
        <TableList
          sections={sections}
          getLink={(table) => `/table/${table.id}`}
        />
      </MemoryRouter>
    );

    // 2 SlideTransitions per section (heading + list paper) * 3 sections = 6
    expect(capturedTimeouts).toHaveLength(6);
    expect(capturedTimeouts.every((t) => t === 50)).toBe(true);
  });

  test("useBasicSearch filters 170 tables after 200ms default debounce", () => {
    vi.useFakeTimers();
    try {
      const tables = createMockTables(170);
      const keys = ["id", "name", "section", "description"];

      const { result } = renderHook(() => useBasicSearch(tables, keys));
      expect(result.current[0]).toHaveLength(170);

      act(() => {
        result.current[2]("Story");
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current[1]).toBe("Story");
      expect(result.current[0]).toHaveLength(1);
      expect(result.current[0][0].name).toBe("Story Table");
    } finally {
      vi.useRealTimers();
    }
  });
});
