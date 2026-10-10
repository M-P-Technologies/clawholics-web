// Shared setup for the Postgres integration tests in this folder. They drop and rebuild the
// public schema, so they only ever run against a localhost database (see scripts/test-db.mjs,
// which runs the files one at a time).
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const isLocalDatabase = (url: string) => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL && isLocalDatabase(process.env.TEST_DATABASE_URL) ? process.env.TEST_DATABASE_URL : undefined;

if (process.env.TEST_DATABASE_URL && !TEST_DATABASE_URL) {
  console.warn("TEST_DATABASE_URL is not a localhost database; skipping the Postgres tests (they drop the schema).");
}

const supabaseDir = path.resolve(__dirname, "../../../supabase");
const migration = readFileSync(path.join(supabaseDir, "migrations/20261010000000_init.sql"), "utf8");
const seed = readFileSync(path.join(supabaseDir, "seed.sql"), "utf8");

/** A fresh schema with the migration and dev seed, and the app pointed at it in `next` mode. */
export async function resetTestDatabase() {
  const admin = postgres(TEST_DATABASE_URL!, { max: 1, onnotice: () => {} });
  await admin.unsafe("drop schema public cascade; create schema public;");
  await admin.unsafe(migration);
  await admin.unsafe(seed);
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.API_BACKEND = "next";
  return admin;
}

/** Calls a route handler like Next would, with the frontend's origin header. */
export async function callRoute(
  handler: (req: Request, ctx: never) => Promise<Response> | Response,
  url: string,
  { method = "GET", body, params }: { method?: string; body?: unknown; params?: object } = {},
) {
  const isForm = body instanceof FormData;
  const req = new Request(`http://localhost${url}`, {
    method,
    headers: { "x-clawholics-origin": "frontend", ...(body && !isForm ? { "content-type": "application/json" } : {}) },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const res = await handler(req, { params: Promise.resolve(params ?? {}) } as never);
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // plain-text responses (the webhook's "OK")
  }
  return { status: res.status, body: json as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}
