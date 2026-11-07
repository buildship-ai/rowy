import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { matchSorter, rankings } from "match-sorter";

export function useBasicSearch<T>(
  list: T[],
  keys: string[],
  debounce: number = 200
) {
  const [query, setQuery] = useState("");
  const handleQuery = useDebouncedCallback(setQuery, debounce);

  const results = query
    ? matchSorter(list, query, { keys, threshold: rankings.ACRONYM })
    : list;

  return [results, query, handleQuery] as const;
}

export default useBasicSearch;
