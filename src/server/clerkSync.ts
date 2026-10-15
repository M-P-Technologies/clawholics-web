import "server-only";
import { clerkClient, type User } from "@clerk/nextjs/server";
import { getSql } from "./db";

// Keeps the users / *_profiles tables and Clerk in step, ported from the Worker's Clerk sync
// helpers (worker-api/src/index.ts ~lines 95-245). Clerk calls never fail the request: errors
// are logged, as on the Worker.

/** Only real Clerk ids (directory rows added by hand have `manual_...` ids). */
export const isClerkUserId = (id?: string | null) => Boolean(id && id.startsWith("user_"));

const emailOf = (user: User) => user.emailAddresses[0]?.emailAddress ?? "";
export const clerkRole = (user: User) => String(user.publicMetadata?.role ?? "").trim().toLowerCase();

/** The first 100 Clerk users, like the Worker's fetchClerkUsers. */
async function listClerkUsers(): Promise<User[]> {
  try {
    return (await (await clerkClient()).users.getUserList({ limit: 100 })).data;
  } catch (error) {
    console.error("[clerk] could not list users:", error);
    return [];
  }
}

export async function findClerkUserByEmail(email: string): Promise<User | null> {
  if (!email) return null;
  try {
    const { data } = await (await clerkClient()).users.getUserList({ emailAddress: [email], limit: 1 });
    return data[0] ?? null;
  } catch (error) {
    console.error("[clerk] could not look up user by email:", error);
    return null;
  }
}

export async function getClerkUser(clerkId: string): Promise<User | null> {
  if (!isClerkUserId(clerkId)) return null;
  return (await clerkClient()).users.getUser(clerkId).catch(() => null);
}

/**
 * Copies Clerk users into the directory: admins (publicMetadata.role) get an admin row, the
 * rest a customer row whose role is kept if already set. Names only fill empty ones.
 */
// Every directory load asks for a sync; one at a time, and at most every two minutes, is plenty
// (each pass writes up to 100 users, and several at once kept the database connections busy)
const SYNC_INTERVAL_MS = 2 * 60_000;
let syncRunning = false;
let lastSyncAt = 0;

export async function syncAllUsersFromClerk() {
  if (syncRunning || Date.now() - lastSyncAt < SYNC_INTERVAL_MS) return;
  syncRunning = true;
  try {
    await syncAllUsers();
  } finally {
    syncRunning = false;
    lastSyncAt = Date.now();
  }
}

// Clerk users whose email another directory row already has: logged once per server, not on
// every pass
const skippedUsers = new Set<string>();

// Each user is written with one statement: the users row and, through a data-modifying CTE, its
// profile. A single statement is atomic on its own, so the sync needs no transaction. It used to
// open one per user, and on Supabase's transaction pooler those (some failing on a taken email)
// left the shared connections stuck, stalling other requests (seen on the Schedule).
async function syncAllUsers() {
  const sql = getSql();
  for (const user of await listClerkUsers()) {
    const isAdmin = clerkRole(user) === "admin";
    const email = emailOf(user);
    const firstName = user.firstName ?? "";
    const lastName = user.lastName ?? "";
    try {
      const [row] = isAdmin
        ? await sql<{ synced: boolean }[]>`
            with synced as (
              insert into users (clerk_id, email, role)
              select ${user.id}, ${email}, 'admin'
              -- An email another row already has would break users_email_key: skip the user
              where not exists (select 1 from users where email = ${email} and clerk_id is distinct from ${user.id})
              on conflict (clerk_id) do update set email = excluded.email, role = 'admin'
              returning id
            ), profile as (
              insert into admin_profiles (user_id, first_name, last_name)
              select id, ${firstName}, ${lastName} from synced
              on conflict (user_id) do update set
                first_name = case when coalesce(admin_profiles.first_name, '') = '' then excluded.first_name else admin_profiles.first_name end,
                last_name = case when coalesce(admin_profiles.last_name, '') = '' then excluded.last_name else admin_profiles.last_name end
            )
            select exists (select 1 from synced) as synced
          `
        : await sql<{ synced: boolean }[]>`
            with synced as (
              insert into users (clerk_id, email, role)
              select ${user.id}, ${email}, 'customer'
              where not exists (select 1 from users where email = ${email} and clerk_id is distinct from ${user.id})
              on conflict (clerk_id) do update set email = excluded.email, role = coalesce(users.role, 'customer')
              returning id, role
            ), profile as (
              -- A row kept as admin (by the directory) gets no customer profile
              insert into customer_profiles (user_id, first_name, last_name)
              select id, ${firstName}, ${lastName} from synced where role is distinct from 'admin'
              on conflict (user_id) do update set
                first_name = case when coalesce(customer_profiles.first_name, '') = '' then excluded.first_name else customer_profiles.first_name end,
                last_name = case when coalesce(customer_profiles.last_name, '') = '' then excluded.last_name else customer_profiles.last_name end
            )
            select exists (select 1 from synced) as synced
          `;
      if (!row?.synced && !skippedUsers.has(user.id)) {
        skippedUsers.add(user.id);
        console.warn(`[clerk] skipped user ${user.id}: their email already belongs to another directory row`);
      }
    } catch (error) {
      console.error(`[clerk] could not sync user ${user.id}:`, error);
    }
  }
}

/** Pushes a name and/or role change to Clerk. The role is merged into publicMetadata. */
export async function syncUserToClerk(clerkId: string, data: { firstName?: string; lastName?: string; role?: string }) {
  if (!isClerkUserId(clerkId)) return;
  try {
    const users = (await clerkClient()).users;
    const names = {
      ...(data.firstName ? { firstName: data.firstName } : {}),
      ...(data.lastName ? { lastName: data.lastName } : {}),
    };
    if (Object.keys(names).length > 0) await users.updateUser(clerkId, names);
    if (data.role) await users.updateUserMetadata(clerkId, { publicMetadata: { role: data.role } });
  } catch (error) {
    console.error(`[clerk] could not update user ${clerkId}:`, error);
  }
}

export async function deleteUserFromClerk(clerkId: string) {
  if (!isClerkUserId(clerkId)) return;
  try {
    await (await clerkClient()).users.deleteUser(clerkId);
  } catch (error) {
    console.error(`[clerk] could not delete user ${clerkId}:`, error);
  }
}
