import { queryOptions } from "@tanstack/react-query";
import { fetchProfileIfExists, fetchUserAppointments, type UserProfile } from "../services/userService";
import { fetchMyReviews, type Review } from "../services/reviewService";
import type { Appointment } from "../utils/profile";

// The signed-in client's own data as TanStack Query queries, shared by every screen that needs
// it: the onboarding gate on each page, onboarding, the profile, the home page and starting a
// booking all read one cached profile instead of asking for it each time.
// Keys hold the Clerk id, and QueryProvider drops them all when the signed-in user changes.

/** The first part of every signed-in user's query key */
export const ACCOUNT = "account";

/** Clerk's session token getter (useAuth().getToken) */
export type GetToken = () => Promise<string | null>;

export const accountKeys = {
  profile: (clerkId: string) => [ACCOUNT, clerkId, "profile"] as const,
  appointments: (clerkId: string) => [ACCOUNT, clerkId, "appointments"] as const,
  reviews: (clerkId: string) => [ACCOUNT, clerkId, "reviews"] as const,
};

export const accountQueries = {
  /** The client's profile, or null when they have none yet (a new account, before onboarding) */
  profile: (clerkId: string, getToken: GetToken) =>
    queryOptions({
      queryKey: accountKeys.profile(clerkId),
      queryFn: async (): Promise<UserProfile | null> => fetchProfileIfExists(clerkId, await getToken()),
    }),
  appointments: (clerkId: string, getToken: GetToken) =>
    queryOptions({
      queryKey: accountKeys.appointments(clerkId),
      queryFn: async (): Promise<Appointment[]> => (await fetchUserAppointments(clerkId, await getToken())) ?? [],
    }),
  /** The client's reviews by appointment id */
  reviews: (clerkId: string, getToken: GetToken) =>
    queryOptions({
      queryKey: accountKeys.reviews(clerkId),
      queryFn: async (): Promise<Record<number, Review>> => {
        const list = await fetchMyReviews({ token: await getToken(), clerkId });
        return Object.fromEntries(list.map((r) => [r.appointment_id, r]));
      },
    }),
};

/** An admin by the directory's role (for when Clerk's metadata hasn't caught up) */
export const isAdminProfile = (profile: UserProfile | null | undefined) =>
  String(profile?.role || "").toLowerCase() === "admin";
