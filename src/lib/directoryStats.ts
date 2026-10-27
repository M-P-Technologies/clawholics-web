import type { DirectoryProfile, DirectoryUser } from "@/components/features/admin/directory/DirectoryProfileCard";
import { WALKIN_EMAIL } from "./admin/walkin";

const DAY = 24 * 60 * 60 * 1000;

type Profiles = Record<string, DirectoryProfile>;
type DateField = "joinedAt" | "lastSignInAt";

const profileOf = (user: DirectoryUser, profiles: Profiles) => profiles[user.clerk_id ?? user.id];

/** How many different clients have a Clerk `field` date within the last `days` days: a person
 *  counts once if any of their accounts does (see countUniqueClients) */
export function countWithin(users: DirectoryUser[], profiles: Profiles, field: DateField, days: number, now = Date.now()) {
  return countUniqueClients(users.filter((user) => {
    const time = Date.parse(profileOf(user, profiles)?.[field] ?? "");
    return !Number.isNaN(time) && now - time <= days * DAY;
  }));
}

/** How many different clients haven't signed in for `days` days, or never have */
export function countIdle(users: DirectoryUser[], profiles: Profiles, days: number, now = Date.now()) {
  return countUniqueClients(users) - countWithin(users, profiles, "lastSignInAt", days, now);
}

/** A client account: the directory's "client"/"customer" roles, or no role at all */
export function isClientRole(role?: string) {
  const normalizedRole = role?.trim().toLowerCase();
  return !normalizedRole || normalizedRole === "client" || normalizedRole === "customer";
}

/** The shared account walk-ins without their own are booked on: not a client */
const isWalkinGuest = (user: DirectoryUser) =>
  user.clerk_id === "walkin_guest" || (user.email ?? "").trim().toLowerCase() === WALKIN_EMAIL;

/** Each different client once, in order: one account per email (the same person added by hand and
 *  signed up shows once, as their first account; an account without an email stands on its own),
 *  never the walk-in guest */
export function uniqueClients(users: DirectoryUser[]): DirectoryUser[] {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (isWalkinGuest(user)) return false;
    const person = (user.email ?? "").trim().toLowerCase() || `account:${user.clerk_id ?? user.id}`;
    if (seen.has(person)) return false;
    seen.add(person);
    return true;
  });
}

/** How many different clients (see uniqueClients) */
export const countUniqueClients = (users: DirectoryUser[]) => uniqueClients(users).length;
