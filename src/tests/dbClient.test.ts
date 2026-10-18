// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const postgres = vi.fn(() => ({}));
vi.mock("postgres", () => ({ default: (...args: unknown[]) => postgres(...(args as [])) }));
vi.mock("server-only", () => ({}));

describe("the database client", () => {
  it("sends one query at a time on each connection (max_pipeline 0; 1 still queues one behind the running query): the Supabase pooler stalls on pipelined queries", async () => {
    process.env.DATABASE_URL = "postgres://u:p@localhost:6543/postgres";
    (globalThis as { clawholicsSql?: unknown }).clawholicsSql = undefined;
    const { getSql } = await import("@/server/db");
    getSql();
    expect(postgres).toHaveBeenCalledWith("postgres://u:p@localhost:6543/postgres", expect.objectContaining({ prepare: false, max_pipeline: 0 }));
  });
});
