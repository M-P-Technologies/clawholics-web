// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const getUserMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: getUserMock } }),
}));

// Fake postgres.js: role lookups read `roles`, bootstrap writes are recorded
const roles = new Map<string, string>();
const writes: string[] = [];
const sqlMock = Object.assign(
  vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (text.includes("select role from users")) {
      const role = roles.get(values[0] as string);
      return role ? [{ role }] : [];
    }
    return [];
  }),
  {
    begin: vi.fn(async (fn: (tx: unknown) => Promise<void>) =>
      fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        writes.push(strings.join("?").trim().split(/\s+/).slice(0, 3).join(" "));
        if (strings.join("").includes("insert into users")) roles.set(values[0] as string, "admin");
        return [{ id: 1 }];
      }),
    ),
  },
);
vi.mock("../server/db", () => ({ getSql: () => sqlMock }));

const { getRequester, isAdmin, requireAdmin, requireUser } = await import("../server/auth");

beforeEach(() => {
  roles.clear();
  writes.length = 0;
  authMock.mockReset();
  getUserMock.mockReset();
});

describe("server auth", () => {
  it("TC-AUTH-01: no Clerk session means no requester, 401 and not admin", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect(await getRequester()).toBeNull();
    expect(await isAdmin()).toBe(false);
    const res = await requireUser();
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(401);
  });

  it("TC-AUTH-02: the role comes from users.role for the verified Clerk user", async () => {
    authMock.mockResolvedValue({ userId: "user_admin" });
    roles.set("user_admin", "admin");
    expect(await getRequester()).toEqual({ clerkId: "user_admin", role: "admin" });
    expect(await isAdmin()).toBe(true);
    expect(await requireAdmin()).toEqual({ clerkId: "user_admin", role: "admin" });
  });

  it("TC-AUTH-03: a customer gets 403 from requireAdmin, without a Clerk lookup", async () => {
    authMock.mockResolvedValue({ userId: "user_c" });
    roles.set("user_c", "customer");
    const res = await requireAdmin();
    expect((res as Response).status).toBe(403);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("TC-AUTH-04: a Clerk admin with no users row is provisioned (bootstrap)", async () => {
    authMock.mockResolvedValue({ userId: "user_new" });
    getUserMock.mockResolvedValue({
      publicMetadata: { role: "Admin" },
      emailAddresses: [{ emailAddress: "a@b.c" }],
      firstName: "Max",
      lastName: "C",
    });
    expect(await requireAdmin()).toEqual({ clerkId: "user_new", role: "admin" });
    expect(writes).toEqual(["insert into users", "insert into admin_profiles"]);
  });

  it("TC-AUTH-06: a Clerk admin whose provisioning fails (e.g. email taken) gets 403, not a crash", async () => {
    authMock.mockResolvedValue({ userId: "user_dup" });
    getUserMock.mockResolvedValue({ publicMetadata: { role: "admin" }, emailAddresses: [{ emailAddress: "taken@x.c" }] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    sqlMock.begin.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint "users_email_key"'));
    expect(((await requireAdmin()) as Response).status).toBe(403);
  });

  it("TC-AUTH-05: an unknown user who is not a Clerk admin gets 403 and nothing is written", async () => {
    authMock.mockResolvedValue({ userId: "user_x" });
    getUserMock.mockResolvedValue({ publicMetadata: {}, emailAddresses: [] });
    expect(((await requireAdmin()) as Response).status).toBe(403);
    expect(writes).toEqual([]);
  });
});
