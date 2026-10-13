"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PUBLIC } from "@/lib/publicQueries";

// Rendered by the admin layout. The admin screens can change anything the public pages show,
// and they don't use the public queries, so the public content cached in this tab is dropped on
// the way in: back on the site, the pages fetch it again (and the server's cache was already
// dropped by each save, see server/publicCache).
export default function ForgetPublicContent() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.removeQueries({ queryKey: [PUBLIC] });
  }, [queryClient]);
  return null;
}
