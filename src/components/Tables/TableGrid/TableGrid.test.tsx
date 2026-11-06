import { render, screen, act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import SlideTransition from "@src/components/Modal/SlideTransition";

import TableGrid from "./TableGrid";
import TableList from "@src/components/Tables/TableList";
import useBasicSearch from "@src/hooks/useBasicSearch";
import { TableSettings } from "@src/types/table";

const createTables = (count: number): Record<string, TableSettings[]> => {
  const sections: Record<string, TableSettings[]> = {};

  for (let i = 0; i < count; i++) {
    const section = `Section ${Math.floor(i / 25) + 1}`;
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

describe("Tables search animation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("TableGrid uses constant 50ms transition timeout regardless of table count", () => {
    const spy = vi.spyOn(SlideTransition as any, "render");
    const sections = createTables(170);
    render(
      <MemoryRouter>
        <TableGrid sections={sections} getLink={(t) => `/table/${t.id}`} />
      </MemoryRouter>
    );

    expect(spy).toHaveBeenCalled();
    for (const [props] of spy.mock.calls) {
      expect((props as { timeout: number }).timeout).toBe(50);
    }
    expect(
      screen.getByRole("heading", { name: "Story 169" })
    ).toBeInTheDocument();
  });

  test("TableList uses constant 50ms section transition timeout", () => {
    const spy = vi.spyOn(SlideTransition as any, "render");
    const sections = createTables(170);
    render(
      <MemoryRouter>
        <TableList sections={sections} getLink={(t) => `/table/${t.id}`} />
      </MemoryRouter>
    );

    expect(spy).toHaveBeenCalled();
    for (const [props] of spy.mock.calls) {
      expect((props as { timeout: number }).timeout).toBe(50);
    }
    expect(
      screen.getByRole("heading", { name: "Story 169" })
    ).toBeInTheDocument();
  });

  test("useBasicSearch filters tables after 200ms debounce", () => {
    const tables = Object.values(createTables(10)).flat();
    const { result } = renderHook(() =>
      useBasicSearch(tables, ["id", "name", "section", "description"])
    );

    act(() => {
      result.current[2]("Story 5");
    });
    expect(result.current[0]).toHaveLength(10);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current[1]).toBe("Story 5");
    expect(result.current[0]).toHaveLength(1);
    expect(result.current[0][0].name).toBe("Story 5");
  });
});
