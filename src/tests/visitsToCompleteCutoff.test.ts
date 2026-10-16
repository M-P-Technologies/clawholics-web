import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ getSql: () => { throw new Error("no database here"); } }));

describe("the bell's start date for visits to complete", () => {
  it("is the day this ships (16 Oct 2026), so no visit after it is missed", async () => {
    const { VISIT_NOTIFY_FROM } = await import("@/server/visitsToComplete");
    expect(VISIT_NOTIFY_FROM).toBe("2026-10-16");
  });
});
