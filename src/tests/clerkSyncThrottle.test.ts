// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserList = vi.fn(async () => ({ data: [] }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: { getUserList } }) }));
vi.mock("../server/db", () => ({ getSql: () => ({ begin: vi.fn() }) }));

beforeEach(() => {
  vi.resetModules();
  getUserList.mockClear();
});

describe("Clerk directory sync", () => {
  it("runs at most once every two minutes, however often the directory loads", async () => {
    vi.useFakeTimers();
    try {
      const { syncAllUsersFromClerk } = await import("../server/clerkSync");
      await Promise.all([syncAllUsersFromClerk(), syncAllUsersFromClerk(), syncAllUsersFromClerk()]);
      await syncAllUsersFromClerk();
      expect(getUserList).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(2 * 60_000 + 1);
      await syncAllUsersFromClerk();
      expect(getUserList).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
