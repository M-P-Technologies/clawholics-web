"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { usePreviewVersion } from "@/features/cms/lib/cmsPreview";
import { makeQueryClient } from "@/lib/tanstack-query/publicQueries";
import { ACCOUNT } from "@/lib/tanstack-query/accountQueries";
import { ADMIN } from "@/lib/tanstack-query/adminQueries";

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

// Signing out, or into another account, drops everything cached about the previous user: their
// own data (keyed by Clerk id, so it would never show for another user, but it shouldn't stay in
// the tab) and the admin screens' data.
function ForgetPreviousUser() {
  const queryClient = useQueryClient();
  const { isLoaded, userId } = useAuth();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    if (previous.current !== undefined && previous.current !== current) {
      queryClient.removeQueries({ queryKey: [ACCOUNT] });
      queryClient.removeQueries({ queryKey: [ADMIN] });
    }
    previous.current = current;
  }, [isLoaded, userId, queryClient]);

  return null;
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser tab (and a fresh one per server render, which never fetches)
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <PreviewRefresh />
      <ForgetPreviousUser />
      {children}
    </QueryClientProvider>
  );
}
