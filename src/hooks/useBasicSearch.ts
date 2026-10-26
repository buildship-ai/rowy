import { useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { matchSorter, rankings } from "match-sorter";

export function useBasicSearch<T>(
  list: T[],
  keys: string[],
  debounce: number = 200
) {
  const [query, setQuery] = useState("");
  const handleQuery = useDebouncedCallback(setQuery, debounce);

  const results = useMemo(
    () =>
      query
        ? matchSorter(list, query, { keys, threshold: rankings.ACRONYM })
        : list,
    [list, query, keys]
  );

  return [results, query, handleQuery] as const;
}

export default useBasicSearch;
