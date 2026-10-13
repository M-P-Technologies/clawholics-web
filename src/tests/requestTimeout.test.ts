// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sqlResponds = vi.fn();
const resetSql = vi.fn();
const client = { id: "client" };
const logDatabaseActivity = vi.fn(async (_label: string) => {});
vi.mock("../server/db", () => ({
  sqlResponds: (c: unknown) => sqlResponds(c),
  resetSql: (c: unknown) => resetSql(c),
  currentSql: () => client,
  logDatabaseActivity: (label: string) => logDatabaseActivity(label),
}));

import { REQUEST_TIMEOUT_MS, STALL_CHECK_MS, ported } from "../server/worker";

const request = (method = "GET") => new Request("http://localhost:5174/api/faqs", { method, headers: { "x-clawholics-origin": "frontend" } });
const never = () => new Promise<Response>(() => {});
// The limits count working time in ticks and fire just after them, so the clock goes a little past
const PAST = 500;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("API_BACKEND", "next");
  vi.spyOn(console, "error").mockImplementation(() => {});
  sqlResponds.mockReset();
  resetSql.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ported request time limit", () => {
  it("replaces dead database connections after a short wait and runs a read again", async () => {
    sqlResponds.mockResolvedValue(false);
    const handler = vi.fn().mockImplementationOnce(never).mockResolvedValueOnce(Response.json({ ok: true }));
    const pending = ported(handler)(request(), {});
    await vi.advanceTimersByTimeAsync(STALL_CHECK_MS + PAST);
    const res = await pending;
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(sqlResponds).toHaveBeenCalledWith(client);
    expect(resetSql).toHaveBeenCalledWith(client);
    // What the database was doing is logged, to find out why it stalled
    expect(logDatabaseActivity).toHaveBeenCalledWith("GET /api/faqs waited 10s");
  });

  it("doesn't run a write again: it gets a 503 once the time is up", async () => {
    sqlResponds.mockResolvedValue(false);
    const handler = vi.fn(never);
    const pending = ported(handler)(request("PUT"), {});
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + PAST);
    expect((await pending).status).toBe(503);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(resetSql).toHaveBeenCalledTimes(1);
  });

  it("runs a stuck read again on a healthy connection when the database still answers, keeping the connections", async () => {
    sqlResponds.mockResolvedValue(true);
    const handler = vi.fn().mockImplementationOnce(never).mockResolvedValueOnce(Response.json({ again: true }));
    const pending = ported(handler)(request(), {});
    await vi.advanceTimersByTimeAsync(STALL_CHECK_MS + PAST);
    const res = await pending;
    expect(await res.json()).toEqual({ again: true });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(resetSql).not.toHaveBeenCalled();
  });

  it("takes whichever answer comes first", async () => {
    sqlResponds.mockResolvedValue(true);
    let finishFirst!: (res: Response) => void;
    const handler = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (finishFirst = resolve)))
      .mockImplementationOnce(never);
    const pending = ported(handler)(request(), {});
    await vi.advanceTimersByTimeAsync(STALL_CHECK_MS + 1_000);
    finishFirst(Response.json({ first: true }));
    expect(await (await pending).json()).toEqual({ first: true });
  });

  it("waits for a slow write without running it again", async () => {
    sqlResponds.mockResolvedValue(true);
    let finish!: (res: Response) => void;
    const handler = vi.fn(() => new Promise<Response>((resolve) => (finish = resolve)));
    const pending = ported(handler)(request("POST"), {});
    await vi.advanceTimersByTimeAsync(STALL_CHECK_MS + 5_000);
    finish(Response.json({ ok: true }));
    expect((await pending).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(resetSql).not.toHaveBeenCalled();
  });

  it("answers a request that never finishes with a 503", async () => {
    sqlResponds.mockResolvedValue(true);
    const pending = ported(never)(request(), {});
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + PAST);
    const res = await pending;
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "The server took too long to answer. Please try again." });
  });

  it("runs a read again when its connection broke under it", async () => {
    const broken = Object.assign(new Error("write CONNECTION_DESTROYED"), { code: "CONNECTION_DESTROYED" });
    const handler = vi.fn().mockRejectedValueOnce(broken).mockResolvedValueOnce(Response.json({ ok: true }));
    const res = await ported(handler)(request(), {});
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("doesn't run a write again when its connection broke, and says it failed", async () => {
    const broken = Object.assign(new Error("write CONNECTION_DESTROYED"), { code: "CONNECTION_DESTROYED" });
    const handler = vi.fn().mockRejectedValue(broken);
    const res = await ported(handler)(request("PUT"), {});
    expect(res.status).toBe(500);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("doesn't run a read again for an ordinary error", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("bad query"));
    expect((await ported(handler)(request(), {})).status).toBe(500);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("leaves a normal request alone", async () => {
    const res = await ported(async () => Response.json({ ok: true }))(request(), {});
    expect(res.status).toBe(200);
    expect(sqlResponds).not.toHaveBeenCalled();
  });
});
