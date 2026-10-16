"use client";

import { useUser } from "@clerk/nextjs";

// Who is signed in to the admin, for the top bar
export function useAdminAccount() {
  const { user } = useUser();
  const name = user?.fullName || user?.firstName || "";
  return {
    /** For the greeting: their first name, or "Admin" */
    firstName: user?.firstName || "Admin",
    name: name || "Admin",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    imageUrl: user?.hasImage ? user.imageUrl : "",
  };
}
