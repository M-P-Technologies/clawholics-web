// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A fake database: every query answers no rows, except the unread count
const sql = Object.assign(
  vi.fn((strings: TemplateStringsArray) => Promise.resolve(strings.join("").includes("count(*)") ? [{ unread: 0 }] : [])),
  { unsafe: vi.fn() },
);
vi.mock("../server/db", () => ({ getSql: () => sql }));
const recordVisitsToComplete = vi.fn();
vi.mock("../server/visitsToComplete", () => ({ recordVisitsToComplete }));

const { listAdminNotifications } = await import("../server/notifications");

const MINUTE = 60_000;
// The module remembers its last recording, so each test starts well after the one before
let clock = Date.UTC(2026, 10, 11);

beforeEach(() => {
  clock += 60 * MINUTE;
  vi.useFakeTimers({ now: clock, toFake: ["Date"] });
  recordVisitsToComplete.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("listAdminNotifications: recording visits to complete", () => {
  it("records on the first ask, then at most every 3 minutes", async () => {
    await listAdminNotifications(1);
    expect(recordVisitsToComplete).toHaveBeenCalledTimes(1);

    vi.setSystemTime(clock + 2 * MINUTE);
    await listAdminNotifications(2); // another admin's bell, same server instance
    expect(recordVisitsToComplete).toHaveBeenCalledTimes(1);

    vi.setSystemTime(clock + 3 * MINUTE);
    await listAdminNotifications(1);
    expect(recordVisitsToComplete).toHaveBeenCalledTimes(2);
  });

  it("tries again on the next ask after a failed recording, and still answers the page", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    recordVisitsToComplete.mockRejectedValueOnce(new Error("db down"));
    await expect(listAdminNotifications(1)).resolves.toEqual({ unread: 0, notifications: [], hasMore: false });

    vi.setSystemTime(clock + 10_000);
    await listAdminNotifications(1);
    expect(recordVisitsToComplete).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it("doesn't record when an older page is asked for", async () => {
    await listAdminNotifications(1, { before: 50 });
    expect(recordVisitsToComplete).not.toHaveBeenCalled();
  });
});
