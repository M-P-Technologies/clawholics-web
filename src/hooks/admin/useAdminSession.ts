"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import type { AdminSession } from "@/lib/adminQueries";

/** The signed-in admin's session for the admin queries, and whether Clerk has loaded it */
export function useAdminSession(): { session: AdminSession; ready: boolean } {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();
  return { session: { getToken, clerkId: user?.id }, ready: isLoaded };
}
