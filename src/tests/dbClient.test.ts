// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for each postgres.js client made: getSql makes two (queries, and transactions).
// Their own `end`s are kept here, since getSql replaces the query client's with one ending both.
const ends: ReturnType<typeof vi.fn>[] = [];
const fakeClient = () => {
  const end = vi.fn(async () => {});
  ends.push(end);
  return { begin: vi.fn(async () => "began"), end };
};
const postgres = vi.fn((..._args: unknown[]) => fakeClient()); // eslint-disable-line @typescript-eslint/no-unused-vars
vi.mock("postgres", () => ({ default: (...args: unknown[]) => postgres(...args) }));
vi.mock("server-only", () => ({}));

const URL = "postgres://u:p@localhost:6543/postgres";

async function freshClient() {
  process.env.DATABASE_URL = URL;
  (globalThis as { clawholicsSql?: unknown }).clawholicsSql = undefined;
  const { getSql } = await import("@/server/db");
  return getSql();
}

describe("the database client", () => {
  beforeEach(() => {
    postgres.mockClear();
    ends.length = 0;
  });

  it("sends one query at a time on each connection (max_pipeline 0; 1 still queues one behind the running query): the Supabase pooler stalls on pipelined queries", async () => {
    await freshClient();
    expect(postgres).toHaveBeenCalledWith(URL, expect.objectContaining({ prepare: false, max_pipeline: 0 }));
  });

  it("runs transactions on their own small pool, which postgres.js needs pipelining for (UNSAFE_TRANSACTION otherwise)", async () => {
    const sql = await freshClient();
    expect(postgres).toHaveBeenCalledTimes(2);
    expect(postgres).toHaveBeenLastCalledWith(URL, expect.objectContaining({ prepare: false, max: 3, max_pipeline: 100 }));
    const transactions = postgres.mock.results[1].value as ReturnType<typeof fakeClient>;

    await expect(sql.begin(async () => {})).resolves.toBe("began");
    expect(transactions.begin).toHaveBeenCalled();
  });

  it("closes both pools when it's ended", async () => {
    const sql = await freshClient();
    await sql.end({ timeout: 5 });
    expect(ends).toHaveLength(2);
    for (const end of ends) expect(end).toHaveBeenCalledWith({ timeout: 5 });
  });
});
