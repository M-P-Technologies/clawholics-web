import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/adminQueries";
import type { AttentionResponse, AttentionTab } from "@/services/dashboardTypes";

export type AttentionLoader = (params: { tab: AttentionTab; page: number; pageSize: number }) => Promise<AttentionResponse>;

// The dashboard's To act on queue, a page at a time from the server (`pageSize` rows, as many as the
// dashboard fits). Each page is cached by TanStack Query under the appointments key, so coming back
// shows it at once and a change to a booking anywhere refreshes it (adminDataChanged); the next page
// is fetched ahead. The queue remembers the first row shown, so a new page size keeps it in view.
export function useAttentionQueue(load: AttentionLoader, pageSize: number) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AttentionTab>("all");
  const [first, setFirst] = useState(0);
  const page = Math.floor(first / pageSize) + 1;

  const query = useQuery({
    queryKey: adminKeys.attention(tab, page, pageSize),
    queryFn: () => load({ tab, page, pageSize }),
    placeholderData: keepPreviousData,
  });
  // While the next page loads, `data` is still the page before it (with its own page and pageSize)
  const data = query.data;
  const current = query.isPlaceholderData ? undefined : data;

  // Acting on rows can leave fewer pages than the one shown: go back to the last one
  if (current && current.total > 0 && first >= current.total) {
    setFirst((Math.ceil(current.total / pageSize) - 1) * pageSize);
  }

  const total = current?.total;
  useEffect(() => {
    if (total === undefined || page * pageSize >= total) return;
    const next = page + 1;
    void queryClient.prefetchQuery({ queryKey: adminKeys.attention(tab, next, pageSize), queryFn: () => load({ tab, page: next, pageSize }) });
  }, [queryClient, load, tab, page, pageSize, total]);

  return {
    tab,
    setTab: (next: AttentionTab) => {
      setTab(next);
      setFirst(0);
    },
    setPage: (next: number) => setFirst((next - 1) * pageSize),
    data,
    /** Still showing the rows from before the page or tab asked for */
    stale: query.isPlaceholderData,
    /** Nothing to show: the first load failed */
    failed: query.isError && !data,
    /** A later page or tab failed to load (the rows from before are still shown) */
    pageFailed: query.isError && Boolean(data),
  };
}
