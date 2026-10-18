import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSql } from "./db";
import { nextApiEnabled } from "./worker";

// Who is calling, from a Clerk-verified session (the Authorization: Bearer token the services
// send, or the same-origin __session cookie). Unlike the Worker, the `clerk_id` header is
// never trusted. Roles come from users.role, as on the Worker.

interface Requester {
  clerkId: string;
  role: string | null;
}

export async function getRequester(): Promise<Requester | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await getSql()<{ role: string | null }[]>`
    select role from users where clerk_id = ${userId}
  `;
  return { clerkId: userId, role: user?.role ?? null };
}

export interface RequesterUser {
  clerkId: string;
  /** users.id, or null when the signed-in user has no users row yet */
  id: number | null;
  role: string | null;
}

/** Like requireUser, plus the users.id needed for ownership checks. */
export async function requireUserRow(): Promise<RequesterUser | Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Authentication required." }, { status: 401 });
  const [user] = await getSql()<{ id: number; role: string | null }[]>`
    select id, role from users where clerk_id = ${userId}
  `;
  return { clerkId: userId, id: user?.id ?? null, role: user?.role ?? null };
}

/** The signed-in user owns the record (users.id), or is an admin. */
export const canAccess = (requester: RequesterUser, ownerUserId: number | null | undefined) =>
  requester.role === "admin" || (requester.id !== null && requester.id === ownerUserId);

/** For public GETs that show more to admins (the Worker's isAdminRequester). */
export async function isAdmin(): Promise<boolean> {
  return (await getRequester())?.role === "admin";
}

/**
 * For the admin and client layouts: whether users.role says admin. Until the cutover
 * (API_BACKEND=worker) the roles live in D1 behind the Worker, so only Clerk's role counts and this
 * is false; a failed lookup also falls back to Clerk's role. `where` names the caller in the log.
 */
export async function isApiAdmin(where: string): Promise<boolean> {
  if (!nextApiEnabled()) return false;
  try {
    return await isAdmin();
  } catch (error) {
    console.error(`[${where}] role lookup failed:`, error);
    return false;
  }
}

export async function requireUser(): Promise<Requester | Response> {
  const requester = await getRequester();
  if (!requester) return Response.json({ error: "Authentication required." }, { status: 401 });
  return requester;
}

// An admin set in Clerk (publicMetadata.role) who has no users row yet gets one, like the
// Worker's bootstrap. The Worker's "empty database: anyone becomes admin" fallback is not
// ported: it let the first caller of an empty install take over.
async function bootstrapAdmin(clerkId: string): Promise<boolean> {
  const clerkUser = await (await clerkClient()).users.getUser(clerkId).catch(() => null);
  const role = String(clerkUser?.publicMetadata?.role ?? "").trim().toLowerCase();
  if (!clerkUser || role !== "admin") return false;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const sql = getSql();
  // users.email is unique too: if another row already has this email the insert fails, and
  // the caller is refused (403) rather than getting a 500.
  return sql.begin(async (tx) => {
    const [user] = await tx<{ id: number }[]>`
      insert into users (clerk_id, email, role) values (${clerkId}, ${email}, 'admin')
      on conflict (clerk_id) do update set role = 'admin', email = excluded.email
      returning id
    `;
    await tx`
      insert into admin_profiles (user_id, first_name, last_name)
      values (${user.id}, ${clerkUser.firstName ?? ""}, ${clerkUser.lastName ?? ""})
      on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name
    `;
    return true;
  }).catch((error) => {
    console.error(`[auth] could not provision admin ${clerkId}:`, error);
    return false;
  });
}

export async function requireAdmin(): Promise<Requester | Response> {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;
  if (requester.role === "admin") return requester;
  if (requester.role === null && (await bootstrapAdmin(requester.clerkId))) {
    return { ...requester, role: "admin" };
  }
  return Response.json({ error: "Forbidden: Admin access required." }, { status: 403 });
}
