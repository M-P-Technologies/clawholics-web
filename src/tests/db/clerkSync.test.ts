// @vitest-environment node
// The Clerk directory sync (server/clerkSync) against a throwaway Postgres (`npm run test:db`):
// each Clerk user becomes a users row and a profile, one statement each and no transaction,
// and a user whose email another row already has is skipped instead of failing.
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, resetTestDatabase } from "./testDatabase";

const getUserList = vi.fn(async () => ({ data: [] as unknown[], totalCount: 0 }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({ users: { getUserList } }) }));

const clerkUser = (id: string, email: string, firstName: string, role?: string) => ({
  id,
  firstName,
  lastName: "Lee",
  emailAddresses: [{ emailAddress: email }],
  publicMetadata: role ? { role } : {},
});

describe.skipIf(!TEST_DATABASE_URL)("Clerk directory sync (Postgres)", () => {
  let db: ReturnType<typeof postgres>;

  beforeAll(async () => {
    db = await resetTestDatabase();
    // Already in the directory: a client the directory made an admin, a client with a name, and
    // a row (added by hand) that holds an email a Clerk user also uses
    await db`insert into users (clerk_id, email, role) values ('user_kept', 'kept@x.test', 'admin')`;
    const [named] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_named', 'named@x.test', 'customer') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name) values (${named.id}, 'Nina', '')`;
    await db`insert into users (clerk_id, email, role) values ('manual_1', 'taken@x.test', 'customer')`;
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("TC-SYNC-01: writes each user without a transaction, and skips one whose email is taken", async () => {
    getUserList.mockResolvedValue({
      data: [
        clerkUser("user_new", "new@x.test", "Nora"),
        clerkUser("user_boss", "boss@x.test", "Bea", "admin"),
        clerkUser("user_kept", "kept@x.test", "Kim"),
        clerkUser("user_named", "named@x.test", "Changed"),
        clerkUser("user_dupe", "taken@x.test", "Dee"),
      ],
      totalCount: 5,
    });
    const { getSql } = await import("../../server/db");
    const begin = vi.spyOn(getSql(), "begin");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const { syncAllUsersFromClerk } = await import("../../server/clerkSync");
    await syncAllUsersFromClerk();

    expect(begin).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    const role = async (clerkId: string) => (await db<{ role: string }[]>`select role from users where clerk_id = ${clerkId}`)[0]?.role;

    // A new client: a customer row and profile
    expect(await role("user_new")).toBe("customer");
    expect(await db`select first_name from customer_profiles cp join users u on u.id = cp.user_id where u.clerk_id = 'user_new'`).toEqual([{ first_name: "Nora" }]);
    // An admin in Clerk: an admin row and admin profile
    expect(await role("user_boss")).toBe("admin");
    expect(await db`select first_name from admin_profiles ap join users u on u.id = ap.user_id where u.clerk_id = 'user_boss'`).toEqual([{ first_name: "Bea" }]);
    // Made an admin by the directory: stays one, and gets no customer profile
    expect(await role("user_kept")).toBe("admin");
    expect(await db`select 1 from customer_profiles cp join users u on u.id = cp.user_id where u.clerk_id = 'user_kept'`).toHaveLength(0);
    // A name already set isn't overwritten; an empty one is filled
    expect(await db`select first_name, last_name from customer_profiles cp join users u on u.id = cp.user_id where u.clerk_id = 'user_named'`).toEqual([{ first_name: "Nina", last_name: "Lee" }]);
    // The email belongs to another row: skipped, not failed, and said once
    expect(await role("user_dupe")).toBeUndefined();
    expect(await db`select clerk_id from users where email = 'taken@x.test'`).toEqual([{ clerk_id: "manual_1" }]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("user_dupe");
  });
});
