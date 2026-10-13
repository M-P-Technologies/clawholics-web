"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { usePreviewVersion } from "@/lib/cmsPreview";
import { makeQueryClient } from "@/lib/publicQueries";

// In the admin editor's live preview, the drafts change under the cached content: fetch it
// again (through lib/cmsPreview, which lays the drafts over it) whenever they do. Outside the
// preview the version stays 0, so this does nothing.
function PreviewRefresh() {
  const queryClient = useQueryClient();
  const version = usePreviewVersion();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void queryClient.invalidateQueries();
  }, [version, queryClient]);

  return null;
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser tab (and a fresh one per server render, which never fetches)
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <PreviewRefresh />
      {children}
    </QueryClientProvider>
  );
}
