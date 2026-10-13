import "server-only";
import postgres from "postgres";

// One shared postgres.js client for the Supabase database. DATABASE_URL should be the
// transaction pooler (port 6543), which doesn't support prepared statements, hence
// `prepare: false`. The client is kept on globalThis so dev hot reloads reuse it instead
// of opening a new pool each time.

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { clawholicsSql?: Sql };

function createClient(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // A separate object: postgres.js reads max_pipeline but its type definitions don't list it
  const options = {
    prepare: false,
    max: 5,
    // One query at a time on each connection. postgres.js otherwise pipelines queries that arrive
    // while every connection is busy (the dashboard runs about thirty at once), and Supabase's
    // transaction pooler stalls on pipelined queries: the database waits for the rest of a query
    // that never comes (ClientRead) until the statement times out. Extra queries now wait for a
    // free connection instead.
    max_pipeline: 1,
    // The pooler (or the network, after a sleep or a Wi-Fi change) can drop a connection without
    // telling us. The default would then leave a request waiting about 100 seconds before the
    // dead socket is noticed. These make that detection quick and retire connections early.
    idle_timeout: 10,
    max_lifetime: 5 * 60,
    keep_alive: 5,
    connect_timeout: 10,
  };
  return postgres(url, options);
}

/** Lazily created, so importing this module never needs DATABASE_URL (e.g. at build time). */
export function getSql(): Sql {
  globalForDb.clawholicsSql ??= createClient();
  return globalForDb.clawholicsSql;
}
