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
  const keysSignature = keys.join("\0");

  const results = useMemo(
    () =>
      query
        ? matchSorter(list, query, { keys, threshold: rankings.ACRONYM })
        : list,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, query, keysSignature]
  );

  return [results, query, handleQuery] as const;
}

export default useBasicSearch;
