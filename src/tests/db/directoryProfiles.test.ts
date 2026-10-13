// @vitest-environment node
// The directory cards' photos, join dates and last sign-ins from Clerk (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
const getUserList = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUserList: (...a: unknown[]) => getUserList(...a), getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });
const clerkUser = (id: string, over: object = {}) => ({
  id, hasImage: true, imageUrl: `https://img.clerk.com/${id}.png`, createdAt: Date.UTC(2026, 5, 1), lastSignInAt: Date.UTC(2026, 9, 10), ...over,
});

describe.skipIf(!TEST_DATABASE_URL)("directory profiles (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let handlers: typeof import("../../server/handlers/directoryProfiles");

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users, scan_history restart identity cascade`;
    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin'), ('user_ana', 'ana@x.test', 'customer')`;
    handlers = await import("../../server/handlers/directoryProfiles");
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("are for admins only", async () => {
    as("user_ana");
    expect((await callRoute(handlers.listDirectoryProfiles, "/api/directory/profiles")).status).toBe(403);
  });

  it("give each Clerk user's photo (only one they uploaded), join date and last sign-in, page by page", async () => {
    as("user_admin");
    getUserList.mockReset()
      .mockResolvedValueOnce({ data: [clerkUser("user_a"), ...Array.from({ length: 499 }, (_, i) => clerkUser(`user_p${i}`))] })
      .mockResolvedValueOnce({ data: [clerkUser("user_b", { hasImage: false, lastSignInAt: null })] });
    const { status, body } = await callRoute(handlers.listDirectoryProfiles, "/api/directory/profiles");
    expect(status).toBe(200);
    const profiles = (body as { profiles: Record<string, unknown> }).profiles;
    expect(profiles.user_a).toEqual({ imageUrl: "https://img.clerk.com/user_a.png", joinedAt: "2026-06-01T00:00:00.000Z", lastSignInAt: "2026-10-10T00:00:00.000Z" });
    expect(profiles.user_b).toEqual({ imageUrl: null, joinedAt: "2026-06-01T00:00:00.000Z", lastSignInAt: null });
    expect(getUserList).toHaveBeenCalledTimes(2);
    expect(getUserList).toHaveBeenLastCalledWith({ limit: 500, offset: 500 });
  });

  it("answer with no profiles, not an error, when Clerk can't be reached", async () => {
    as("user_admin");
    getUserList.mockReset().mockRejectedValue(new Error("Clerk is down"));
    const { status, body } = await callRoute(handlers.listDirectoryProfiles, "/api/directory/profiles");
    expect(status).toBe(200);
    expect(body).toEqual({ profiles: {} });
  });
});
