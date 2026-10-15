import type { DirectoryProfile, DirectoryUser } from "@/components/features/admin/directory/DirectoryProfileCard";

const DAY = 24 * 60 * 60 * 1000;

type Profiles = Record<string, DirectoryProfile>;
type DateField = "joinedAt" | "lastSignInAt";

const profileOf = (user: DirectoryUser, profiles: Profiles) => profiles[user.clerk_id ?? user.id];

/** How many of `users` have a Clerk `field` date within the last `days` days */
export function countWithin(users: DirectoryUser[], profiles: Profiles, field: DateField, days: number, now = Date.now()) {
  return users.filter((user) => {
    const time = Date.parse(profileOf(user, profiles)?.[field] ?? "");
    return !Number.isNaN(time) && now - time <= days * DAY;
  }).length;
}

/** How many of `users` haven't signed in for `days` days, or never have */
export function countIdle(users: DirectoryUser[], profiles: Profiles, days: number, now = Date.now()) {
  return users.length - countWithin(users, profiles, "lastSignInAt", days, now);
}

/** A client account: the directory's "client"/"customer" roles, or no role at all */
export function isClientRole(role?: string) {
  const normalizedRole = role?.trim().toLowerCase();
  return !normalizedRole || normalizedRole === "client" || normalizedRole === "customer";
}
