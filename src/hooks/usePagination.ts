import { useState } from "react";
import { PAGE_SIZE } from "../lib/pagination";

/**
 * Splits a list into pages. `resetKey` is whatever decides which items are in the list (a filter,
 * a search): when it changes, the list goes back to its first page.
 */
export function usePagination<T>(items: T[], resetKey: string = "", pageSize = PAGE_SIZE) {
  const [state, setState] = useState({ page: 1, key: resetKey });

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const requested = state.key === resetKey ? state.page : 1;
  const page = Math.min(Math.max(requested, 1), totalPages);

  const setPage = (next: number) => setState({ page: next, key: resetKey });

  return {
    page,
    setPage,
    totalPages,
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
  };
}
