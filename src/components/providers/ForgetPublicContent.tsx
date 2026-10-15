"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PUBLIC } from "@/lib/publicQueries";
import { BOOKING } from "@/lib/bookingQueries";

// Rendered by the admin layout. The admin screens can change anything the public pages show
// (and the artists' hours and days off the booking screens read), and they don't use those
// queries, so what this tab cached of them is dropped on the way in: back on the site, the pages
// fetch it again (and the server's cache was already
// dropped by each save, see server/publicCache).
export default function ForgetPublicContent() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.removeQueries({ queryKey: [PUBLIC] });
    queryClient.removeQueries({ queryKey: [BOOKING] });
  }, [queryClient]);
  return null;
}
