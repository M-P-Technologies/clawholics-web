import "server-only";
import type { TransactionSql } from "postgres";
import { LATEST_PROOF, cancelExpiredPendingAppointments } from "../appointments";
import { requireAdmin, requireUser } from "../auth";
import {
  clerkRole,
  deleteUserFromClerk,
  findClerkUserByEmail,
  getClerkUser,
  isClerkUserId,
  syncAllUsersFromClerk,
  syncUserToClerk,
} from "../clerkSync";
import { getSql } from "../db";
import { sendLoyaltyRewardEmails } from "../email";
import { inBackground, orNull, pgErrorCode, readJson, routeNotFound, toId } from "../http";
import { getLoyaltyStampsRequired } from "../loyalty";
import { ported } from "../worker";
import { manilaTimeOfDay } from "@/lib/timeFormat";
import { parseServerTime } from "@/services/serverTime";

// Directory, profile and loyalty routes, ported from worker-api/src/index.ts
// (~lines 1386-1703). Bodies, status codes and messages match the Worker, including its
// directory errors sent as 200 { error }. Access is stricter, from the Clerk-verified session:
// - Admin: the directory, promote-admin, the admin list, stamps, QR scans and scan history.
//   The Worker left /users/stamps and /users/scan/* open to any caller.
// - Signed-in user: their own profile, appointments and reward (or any user's, for an admin).
//   The Worker trusted the clerk_id header / query param instead.

type Body = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type ClerkIdContext = { params: Promise<{ clerkId: string }> };
type DirectoryContext = { params: Promise<{ id: string }> };

const errorOk = (error: string) => Response.json({ error });

// --- CONTACT FIELDS (customer_profiles), as in the Worker's parseContactFields ---------------

const CONTACT_METHODS = ["call", "sms", "messenger", "instagram"];
const CONTACT_FIELD_ALIASES = {
  alt_phone: "altPhone",
  preferred_contact_method: "preferredContactMethod",
  facebook_handle: "facebookHandle",
  instagram_handle: "instagramHandle",
} as const;
type ContactColumn = keyof typeof CONTACT_FIELD_ALIASES;

// Only the keys present in the body are returned, so a client that doesn't send them never
// wipes the stored values. "" clears a field. Accepts snake_case or camelCase keys.
function parseContactFields(body: Body): { fields: Partial<Record<ContactColumn, string | null>>; error?: string } {
  const fields: Partial<Record<ContactColumn, string | null>> = {};
  for (const [column, alias] of Object.entries(CONTACT_FIELD_ALIASES) as [ContactColumn, string][]) {
    const raw = body?.[column] !== undefined ? body[column] : body?.[alias];
    if (raw === undefined) continue;
    let value = raw === null ? "" : String(raw).trim();
    if (column === "instagram_handle") value = value.replace(/^@+/, "");
    if (!value) {
      fields[column] = null;
      continue;
    }
    if (column === "alt_phone" && !/^[+\d\s()-]+$/.test(value)) return { fields, error: "Invalid alternate phone number format" };
    if (column === "preferred_contact_method") {
      value = value.toLowerCase();
      if (!CONTACT_METHODS.includes(value)) {
        return { fields, error: `Preferred contact method must be one of: ${CONTACT_METHODS.join(", ")}` };
      }
    }
    if (value.length > 100) return { fields, error: `${alias} must be at most 100 characters` };
    fields[column] = value;
  }
  return { fields };
}

// The columns come from the fixed alias list above.
async function updateContactFields(tx: TransactionSql, userId: number, fields: Partial<Record<ContactColumn, string | null>>) {
  if (Object.keys(fields).length === 0) return;
  await tx`update customer_profiles set ${tx(fields as Record<string, string | null>)} where user_id = ${userId}`;
}

const isAdminRole = (role: unknown) => String(role ?? "").toLowerCase() === "admin";

// --- DIRECTORY (admin) -----------------------------------------------------------------------

// GET /directory: every user with their admin or customer profile. Clerk users are copied
// into the table in the background, as on the Worker (they show up on the next load).
export const listDirectory = ported(async () => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  inBackground("directory sync", syncAllUsersFromClerk);

  const rows = await getSql()`
    select u.id, u.clerk_id,
      coalesce(ap.first_name, cp.first_name, '') as "firstName", coalesce(ap.last_name, cp.last_name, '') as "lastName",
      u.email, cp.phone as "phoneNumber", cp.alt_phone as "altPhone",
      cp.preferred_contact_method as "preferredContactMethod", cp.facebook_handle as "facebookHandle",
      cp.instagram_handle as "instagramHandle", u.role
    from users u
    left join admin_profiles ap on u.id = ap.user_id
    left join customer_profiles cp on u.id = cp.user_id
    order by coalesce(ap.first_name, cp.first_name, '') collate "C" asc,
      coalesce(ap.last_name, cp.last_name, '') collate "C" asc, u.id asc
  `;
  return Response.json(rows);
});

const directoryDbError = (error: unknown) => {
  console.error("[directory]", error);
  return pgErrorCode(error) === "23505" ? errorOk("Email already exists in the system.") : errorOk("Database error. Please try again.");
};

// POST /directory: a user added by hand (no Clerk account yet), with a `manual_` id.
export const createDirectoryUser = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  const contact = parseContactFields(body);
  if (contact.error) return errorOk(contact.error);
  if (!body.email) return errorOk("Email is required.");

  try {
    const id = await getSql().begin(async (tx) => {
      const [user] = await tx<{ id: number }[]>`
        insert into users (clerk_id, email, role) values (${`manual_${Date.now()}`}, ${String(body.email)}, ${body.role || "customer"})
        returning id
      `;
      if (isAdminRole(body.role)) {
        await tx`insert into admin_profiles (user_id, first_name, last_name) values (${user.id}, ${body.firstName ?? ""}, ${body.lastName ?? ""})`;
      } else {
        await tx`
          insert into customer_profiles (user_id, first_name, last_name, phone)
          values (${user.id}, ${body.firstName ?? ""}, ${body.lastName ?? ""}, ${body.phoneNumber || ""})
        `;
        await updateContactFields(tx, user.id, contact.fields);
      }
      return user.id;
    });
    return Response.json({ id, ...body }, { status: 201 });
  } catch (error) {
    return directoryDbError(error);
  }
});

// The Worker's `WHERE clerk_id = ? OR id = ?`: the path segment is a Clerk id or a users.id.
const directoryLookup = (sql: ReturnType<typeof getSql> | TransactionSql, idParam: string) => {
  const numericId = toId(idParam);
  return numericId === null ? sql`clerk_id = ${idParam}` : sql`(clerk_id = ${idParam} or id = ${numericId})`;
};

// PUT /directory/:id: edits (or creates) a user and their profile; names and role go to Clerk.
export const updateDirectoryUser = ported<DirectoryContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const body = await readJson<Body>(req);
  const contact = parseContactFields(body);
  if (contact.error) return errorOk(contact.error);
  const firstName = body.firstName || body.first_name || "";
  const lastName = body.lastName || body.last_name || "";

  try {
    await getSql().begin(async (tx) => {
      const [existing] = await tx<{ id: number }[]>`select id from users where ${directoryLookup(tx, id)} limit 1`;
      let userId: number;
      if (existing) {
        userId = existing.id;
        // Email and role are kept when not sent (the Worker wrote NULLs over them)
        await tx`
          update users set email = coalesce(${body.email || null}, email), role = coalesce(${body.role || null}, role)
          where id = ${userId}
        `;
      } else {
        if (!body.email) throw new MissingEmail();
        const [created] = await tx<{ id: number }[]>`
          insert into users (clerk_id, email, role) values (${id}, ${String(body.email)}, ${body.role || "customer"}) returning id
        `;
        userId = created.id;
      }
      if (isAdminRole(body.role)) {
        await tx`
          insert into admin_profiles (user_id, first_name, last_name) values (${userId}, ${firstName}, ${lastName})
          on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name
        `;
      } else {
        await tx`
          insert into customer_profiles (user_id, first_name, last_name, phone) values (${userId}, ${firstName}, ${lastName}, ${body.phoneNumber || ""})
          on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name, phone = excluded.phone
        `;
        await updateContactFields(tx, userId, contact.fields);
      }
    });
  } catch (error) {
    if (error instanceof MissingEmail) return errorOk("Email is required.");
    return directoryDbError(error);
  }

  if (isClerkUserId(id)) await syncUserToClerk(id, { firstName, lastName, role: body.role });
  return Response.json({ id, ...body });
});

class MissingEmail extends Error {}

// DELETE /directory/:id: removes a user with no active appointments, their cancelled history,
// and their Clerk account.
export const deleteDirectoryUser = ported<DirectoryContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const sql = getSql();
  const [user] = await sql<{ id: number; clerk_id: string; role: string | null }[]>`
    select id, clerk_id, role from users where ${directoryLookup(sql, id)} limit 1
  `;
  if (!user) return errorOk("User not found");
  if (user.clerk_id === admin.clerkId) return errorOk("You can't delete your own account.");

  const [{ count: activeCount }] = await sql<{ count: number }[]>`
    select count(*)::int as count from appointments
    where user_id = ${user.id} and status not in ('CANCELLED', 'CANCELED', 'REJECTED', 'REFUNDED')
  `;
  if (activeCount > 0) {
    return errorOk(
      `Cannot delete this user. They have ${activeCount} active or paid appointment(s). You must refund or reject those appointments before the account can be removed for record-keeping purposes.`,
    );
  }

  await sql.begin(async (tx) => {
    await tx`delete from payment_proofs where user_id = ${user.id} or appointment_id in (select id from appointments where user_id = ${user.id})`;
    await tx`update payment_proofs set reviewed_by = null where reviewed_by = ${user.id}`;
    await tx`delete from payments where appointment_id in (select id from appointments where user_id = ${user.id})`;
    await tx`delete from appointments where user_id = ${user.id}`;
    await tx`delete from scan_history where client_clerk_id = ${user.clerk_id}`;
    // admin_profiles and customer_profiles go with the user (on delete cascade)
    await tx`delete from users where id = ${user.id}`;
  });

  if (isAdminRole(user.role)) await syncUserToClerk(user.clerk_id, { role: "customer" });
  await deleteUserFromClerk(user.clerk_id);
  return Response.json({ message: "User and their cancelled history have been completely removed from system" });
});

// --- ADMINS (admin) --------------------------------------------------------------------------

// POST /users/promote-admin { targetEmail | email }: the user must already have a Clerk account.
export const promoteAdmin = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  const email = String(body.targetEmail || body.email || "").trim();

  const clerkUser = await findClerkUserByEmail(email);
  if (!clerkUser || clerkUser.emailAddresses[0]?.emailAddress !== email) {
    return errorOk(`User not found in Clerk. The user with email "${email}" must first sign up for an account before they can be promoted.`);
  }

  const sql = getSql();
  if (clerkRole(clerkUser) === "admin") {
    // Clerk says admin: heal a stale local role. Rows are matched by the verified Clerk id, never
    // by email (a users.email can be set by its owner, so it doesn't prove who the row belongs to).
    await sql`update users set role = 'admin' where clerk_id = ${clerkUser.id}`;
    return errorOk(`${email} is already an admin in the directory.`);
  }

  const promote = sql.begin(async (tx) => {
    const [local] = await tx<{ id: number; firstName: string; lastName: string }[]>`
      select u.id, coalesce(ap.first_name, cp.first_name, '') as "firstName", coalesce(ap.last_name, cp.last_name, '') as "lastName"
      from users u left join admin_profiles ap on u.id = ap.user_id left join customer_profiles cp on u.id = cp.user_id
      where u.clerk_id = ${clerkUser.id}
    `;
    const [user] = local
      ? await tx<{ id: number }[]>`update users set role = 'admin' where id = ${local.id} returning id`
      : await tx<{ id: number }[]>`
          insert into users (clerk_id, email, role) values (${clerkUser.id}, ${email}, 'admin')
          on conflict (clerk_id) do update set role = 'admin', email = excluded.email
          returning id
        `;
    const firstName = local?.firstName || clerkUser.firstName || "";
    const lastName = local?.lastName || clerkUser.lastName || "";
    await tx`
      insert into admin_profiles (user_id, first_name, last_name) values (${user.id}, ${firstName}, ${lastName})
      on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name
    `;
    return { firstName, lastName };
  });
  let names: { firstName: string; lastName: string };
  try {
    names = await promote;
  } catch (error) {
    // Another row (e.g. one added by hand) already holds this email
    if (pgErrorCode(error) === "23505") return errorOk(`Another directory entry already uses ${email}. Remove or edit it first.`);
    throw error;
  }

  await syncUserToClerk(clerkUser.id, { ...names, role: "admin" });
  return Response.json({ message: "User successfully promoted to admin", status: "promoted", email });
});

const MAX_ADMIN_PAGE_SIZE = 50;

// GET /users/admins: every admin, by name. With ?page=N (and pageSize 1-50, default 5) it answers
// one page as { rows, total, page, pageSize, clerkIds }: clerkIds are every admin's Clerk id (null
// for one without), for
// the directory's stat cards (active, inactive, new), which count all admins by their Clerk dates.
export const listAdmins = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const sql = getSql();
  const params = new URL(req.url).searchParams;
  const order = sql`order by coalesce(ap.first_name, '') collate "C" asc, coalesce(ap.last_name, '') collate "C" asc, u.id asc`;
  if (!params.has("page")) {
    const rows = await sql`
      select u.id, u.clerk_id, coalesce(ap.first_name, '') as "firstName", coalesce(ap.last_name, '') as "lastName", u.email, u.role
      from users u join admin_profiles ap on u.id = ap.user_id
      where u.role = 'admin'
      ${order}
    `;
    return Response.json(rows);
  }

  const page = Number(params.get("page"));
  const pageSize = params.has("pageSize") ? Number(params.get("pageSize")) : 5;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_ADMIN_PAGE_SIZE) {
    return Response.json({ error: `page must be 1 or more, and pageSize 1 to ${MAX_ADMIN_PAGE_SIZE}` }, { status: 400 });
  }
  const [rows, all] = await Promise.all([
    sql`
      select u.id, u.clerk_id, coalesce(ap.first_name, '') as "firstName", coalesce(ap.last_name, '') as "lastName", u.email, u.role
      from users u join admin_profiles ap on u.id = ap.user_id
      where u.role = 'admin'
      ${order}
      limit ${pageSize} offset ${(page - 1) * pageSize}
    `,
    sql<{ clerk_id: string | null }[]>`
      select u.clerk_id from users u join admin_profiles ap on u.id = ap.user_id where u.role = 'admin'
    `,
  ]);
  return Response.json({
    rows,
    total: all.length,
    page,
    pageSize,
    clerkIds: all.map((row) => row.clerk_id),
  });
});

// --- PROFILES (the signed-in user, or an admin) ----------------------------------------------

const profileRow = async (clerkId: string) => {
  const [row] = await getSql()<{ created_at: string; phone: string | null; dob: string | null }[]>`
    select u.*, cp.first_name, cp.last_name, cp.phone, cp.dob, cp.gender, cp.stamps, cp.alt_phone,
      cp.preferred_contact_method, cp.facebook_handle, cp.instagram_handle
    from users u left join customer_profiles cp on u.id = cp.user_id
    where u.clerk_id = ${clerkId}
  `;
  return row ?? null;
};

// created_at is UTC text ("YYYY-MM-DD HH:MM:SS"), read the way the Worker's runtime did
function memberSince(createdAt: string) {
  const date = new Date(`${createdAt.replace(" ", "T")}Z`);
  return {
    member_since_month: date.toLocaleString("en-US", { month: "long", timeZone: "UTC" }),
    member_since_year: String(date.getUTCFullYear()),
  };
}

// GET /users/clerk/:clerkId
export const getUserByClerkId = ported<ClerkIdContext>(async (_req, { params }) => {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;
  const { clerkId } = await params;
  if (clerkId !== requester.clerkId && requester.role !== "admin") {
    return Response.json({ error: "Forbidden: You can only view your own profile." }, { status: 403 });
  }
  const user = await profileRow(clerkId);
  return user ? Response.json({ ...user, ...memberSince(user.created_at) }) : Response.json(null, { status: 404 });
});

// GET /users/profile: the signed-in user's own profile (the clerk_id param is ignored).
export const getProfile = ported(async () => {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;
  await cancelExpiredPendingAppointments();
  const user = await profileRow(requester.clerkId);
  if (!user) return Response.json(null, { status: 404 });
  return Response.json({ ...user, onboarded: Boolean(user.phone && user.dob), ...memberSince(user.created_at) });
});

// PUT /users/profile: creates or updates the signed-in user's profile.
export const updateProfile = ported(async (req) => {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;
  const body = await readJson<Body>(req);
  const contact = parseContactFields(body);
  if (contact.error) return Response.json({ message: contact.error }, { status: 400 });
  const firstName = body.firstName || body.first_name || "";
  const lastName = body.lastName || body.last_name || "";
  const clerkId = requester.clerkId;

  // The email always comes from the Clerk account, never the body: promote-admin and the
  // directory find people by email, so a self-chosen one could claim someone else's identity.
  const email = (await getClerkUser(clerkId))?.emailAddresses[0]?.emailAddress ?? null;

  try {
    await getSql().begin(async (tx) => {
      const [existing] = await tx<{ id: number; role: string | null }[]>`select id, role from users where clerk_id = ${clerkId}`;
      const user = existing
        ? existing
        : (await tx<{ id: number; role: string | null }[]>`
            insert into users (clerk_id, email, role) values (${clerkId}, ${email ?? ""}, 'customer') returning id, role
          `)[0];
      if (existing && email) await tx`update users set email = ${email} where id = ${user.id}`;

      if (user.role === "admin") {
        await tx`
          insert into admin_profiles (user_id, first_name, last_name) values (${user.id}, ${firstName}, ${lastName})
          on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name
        `;
      } else {
        await tx`
          insert into customer_profiles (user_id, first_name, last_name, phone, dob, gender)
          values (${user.id}, ${firstName}, ${lastName}, ${orNull(body.phone)}, ${orNull(body.dob)}, ${body.gender || "female"})
          on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name,
            phone = excluded.phone, gender = excluded.gender,
            -- The birthday is set once: changing it would move the birthday voucher to any month
            dob = case when customer_profiles.dob ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then customer_profiles.dob else excluded.dob end
        `;
        await updateContactFields(tx, user.id, contact.fields);
      }
    });
  } catch (error) {
    if (pgErrorCode(error) === "23505") return Response.json({ message: "This email is already used by another account." }, { status: 409 });
    throw error;
  }

  await syncUserToClerk(clerkId, { firstName, lastName });
  return Response.json({ message: "Profile updated" });
});

// PATCH /users/profile: only the signed-in client's optional contact details (other phone,
// Instagram, Facebook, preferred method), saved as they type them while booking. Unlike the PUT,
// it leaves the name, phone, birthday and gender alone.
export const updateContactDetails = ported(async (req) => {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;
  const contact = parseContactFields(await readJson<Body>(req));
  if (contact.error) return Response.json({ message: contact.error }, { status: 400 });

  if (Object.keys(contact.fields).length === 0) return Response.json({ message: "Nothing to update" }, { status: 400 });

  // The columns come from the fixed alias list in parseContactFields
  const sql = getSql();
  const updated = await sql`
    update customer_profiles cp set ${sql(contact.fields as Record<string, string | null>)}
    from users u where u.id = cp.user_id and u.clerk_id = ${requester.clerkId}
    returning cp.user_id
  `;
  if (updated.length === 0) return Response.json({ message: "Profile not found" }, { status: 404 });
  return Response.json({ message: "Contact details updated" });
});

// GET /users/appointments?clerk_id=: that user's appointments, newest date first.
export const getUserAppointments = ported(async (req) => {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;
  const clerkId = new URL(req.url).searchParams.get("clerk_id");
  if (!clerkId) return Response.json({ message: "Missing clerk_id" }, { status: 400 });
  if (clerkId !== requester.clerkId && requester.role !== "admin") {
    return Response.json({ error: "Forbidden: You can only view your own appointments." }, { status: 403 });
  }
  const sql = getSql();
  // latest_proof: the screenshot of the payment the client sent, for their appointment's card
  const rows = await sql`
    select a.*, ${sql.unsafe(LATEST_PROOF)} as latest_proof from appointments a join users u on a.user_id = u.id
    where u.clerk_id = ${clerkId} order by a.appointment_date desc, a.id desc
  `;
  return Response.json(rows);
});

// --- LOYALTY STAMPS --------------------------------------------------------------------------

function emailLoyaltyReward(clerkId: string, stampsRequired?: number) {
  inBackground("loyalty email", async () => {
    const stamps = stampsRequired ?? (await getLoyaltyStampsRequired());
    const [client] = await getSql()<{ first_name: string; last_name: string; email: string; id: number }[]>`
      select cp.first_name, cp.last_name, u.email, u.id
      from users u join customer_profiles cp on u.id = cp.user_id where u.clerk_id = ${clerkId}
    `;
    if (client?.email) await sendLoyaltyRewardEmails(client.email, `${client.first_name} ${client.last_name}`.trim(), client.id, stamps);
  });
}

// PUT /users/stamps { clerk_id, stamps } (admin): sets a client's stamp count.
export const setStamps = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { clerk_id, stamps } = await readJson<{ clerk_id?: unknown; stamps?: unknown }>(req);
  if (!Number.isInteger(stamps) || (stamps as number) < 0) return Response.json({ message: "stamps must be a whole number." }, { status: 400 });
  await getSql()`
    update customer_profiles set stamps = ${stamps as number}
    where user_id = (select id from users where clerk_id = ${String(clerk_id ?? "")})
  `;
  return Response.json({ success: true, stamps });
});

// GET /users/scan/:clerkId (admin): the client behind a scanned loyalty QR code.
export const scanClient = ported<ClerkIdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { clerkId } = await params;
  const [client] = await getSql()<{ first_name: string; last_name: string; stamps: number | null }[]>`
    select p.first_name, p.last_name, p.stamps from users u join customer_profiles p on u.id = p.user_id where u.clerk_id = ${clerkId}
  `;
  return client ? Response.json({ id: clerkId, name: `${client.first_name} ${client.last_name}`, stamps: client.stamps }) : routeNotFound();
});

const cardFull = (stampsRequired: number) =>
  Response.json({ message: `The card is full (${stampsRequired} stamps). Please redeem the reward first.` }, { status: 400 });

// POST /users/scan/:clerkId/stamp (admin): one more stamp, logged under the scanning admin. A full
// card (loyalty_stamps_required) takes no more until it's redeemed.
export const addStamp = ported<ClerkIdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { clerkId } = await params;
  const stampsRequired = await getLoyaltyStampsRequired();
  const newStamps = await getSql().begin(async (tx) => {
    const [user] = await tx<{ id: number }[]>`select id from users where clerk_id = ${clerkId}`;
    if (!user) return undefined;
    const [current] = await tx<{ stamps: number | null }[]>`select stamps from customer_profiles where user_id = ${user.id} for update`;
    if (current && (current.stamps ?? 0) >= stampsRequired) return "full" as const;
    const [profile] = await tx<{ stamps: number }[]>`
      update customer_profiles set stamps = stamps + 1 where user_id = ${user.id} returning stamps
    `;
    await tx`insert into scan_history (admin_clerk_id, client_clerk_id, action) values (${admin.clerkId}, ${clerkId}, 'stamp')`;
    return profile?.stamps ?? null;
  });
  if (newStamps === undefined) return routeNotFound();
  if (newStamps === "full") return cardFull(stampsRequired);
  return Response.json({ success: true, newStamps: newStamps ?? undefined });
});

// POST /users/scan/:clerkId/redeem (admin): a full card is reset and the reward emails go out.
export const redeemScannedReward = ported<ClerkIdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const { clerkId } = await params;
  const stampsRequired = await getLoyaltyStampsRequired();
  const result = await getSql().begin(async (tx) => {
    const [user] = await tx<{ id: number }[]>`select id from users where clerk_id = ${clerkId}`;
    if (!user) return "missing" as const;
    // One statement, so two quick taps can't redeem the same card twice
    const redeemed = await tx`
      update customer_profiles set stamps = 0 where user_id = ${user.id} and stamps >= ${stampsRequired} returning user_id
    `;
    if (redeemed.length === 0) return "short" as const;
    await tx`insert into scan_history (admin_clerk_id, client_clerk_id, action) values (${admin.clerkId}, ${clerkId}, 'redeem')`;
    return "redeemed" as const;
  });
  if (result === "missing") return routeNotFound();
  if (result === "short") return Response.json({ message: "Not enough stamps to redeem." }, { status: 400 });
  emailLoyaltyReward(clerkId, stampsRequired);
  return Response.json({ success: true, newStamps: 0 });
});

// POST /users/redeem: the signed-in client redeems their own full card.
export const redeemOwnReward = ported(async () => {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;
  const sql = getSql();
  const [user] = await sql<{ id: number }[]>`select id from users where clerk_id = ${requester.clerkId}`;
  if (!user) return Response.json({ message: "User not found" }, { status: 404 });

  // One statement, so two quick taps can't redeem the same card twice
  const stampsRequired = await getLoyaltyStampsRequired();
  const redeemed = await sql`
    update customer_profiles set stamps = 0 where user_id = ${user.id} and stamps >= ${stampsRequired} returning user_id
  `;
  if (redeemed.length === 0) return Response.json({ message: "Not enough stamps to redeem." }, { status: 400 });
  emailLoyaltyReward(requester.clerkId, stampsRequired);
  return Response.json({ success: true, newStamps: 0 });
});

const MAX_SCAN_PAGE_SIZE = 50;

// GET /users/scan-history (admin): the last 10 scans. With ?page=N (and pageSize 1-50, default 5) it
// answers one page of all the scans as { rows, total, page, pageSize }, newest first.
export const getScanHistory = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const sql = getSql();
  const params = new URL(req.url).searchParams;
  const paged = params.has("page");
  const page = paged ? Number(params.get("page")) : 1;
  const pageSize = paged ? (params.has("pageSize") ? Number(params.get("pageSize")) : 5) : 10;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_SCAN_PAGE_SIZE) {
    return Response.json({ error: `page must be 1 or more, and pageSize 1 to ${MAX_SCAN_PAGE_SIZE}` }, { status: 400 });
  }
  const [rows, [{ total }]] = await Promise.all([
    sql<{ id: number; userId: string; first_name: string; last_name: string; action: string; created_at: string }[]>`
      select h.id, h.client_clerk_id as "userId", p.first_name, p.last_name, h.action, h.created_at
      from scan_history h join users u on h.client_clerk_id = u.clerk_id join customer_profiles p on u.id = p.user_id
      order by h.created_at desc, h.id desc limit ${pageSize} offset ${(page - 1) * pageSize}
    `,
    sql<{ total: number }[]>`
      select count(*)::int as total
      from scan_history h join users u on h.client_clerk_id = u.clerk_id join customer_profiles p on u.id = p.user_id
    `,
  ]);
  const scans = rows.map((r) => ({
    id: String(r.id),
    userId: r.userId,
    clientName: `${r.first_name} ${r.last_name}`,
    action: r.action,
    // Manila time, like the scans the scanner adds itself
    time: manilaTimeOfDay(parseServerTime(r.created_at)),
  }));
  return Response.json(paged ? { rows: scans, total, page, pageSize } : scans);
});
