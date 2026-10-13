"use client";

import { useUser } from "@clerk/nextjs";
import { useIsClient } from "../useIsClient";

// Who is signed in to the admin, and today's date, for the top bar. The date is empty until the
// page is in the browser, so the server's day never shows in place of the admin's own.
export function useAdminAccount() {
  const { user } = useUser();
  const isClient = useIsClient();
  const name = user?.fullName || user?.firstName || "";
  return {
    /** For the greeting: their first name, or "Admin" */
    firstName: user?.firstName || "Admin",
    name: name || "Admin",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    imageUrl: user?.hasImage ? user.imageUrl : "",
    /** E.g. "Tuesday, Oct 13" */
    today: isClient ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "",
  };
}
