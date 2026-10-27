import "server-only";
import postgres from "postgres";
import { workingTimeWait } from "./loopTimer";

// One shared postgres.js client for the Supabase database. DATABASE_URL should be the
// transaction pooler (port 6543), which doesn't support prepared statements, hence
// `prepare: false`. The client is kept on globalThis so dev hot reloads reuse it instead
// of opening a new pool each time.

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { clawholicsSql?: Sql; clawholicsSqlSetup?: string };

// Bumped when createClient's setup changes, so a dev server that hot-reloads this file replaces
// the client it kept on globalThis instead of reusing one built the old way
const CLIENT_SETUP = "transactions-pool-1";

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
    // free connection instead. It must be 0, not 1: postgres.js counts only the queries queued
    // behind the running one, so 1 still sent a second query down a busy connection.
    max_pipeline: 0,
    // The pooler (or the network, after a sleep or a Wi-Fi change) can drop a connection without
    // telling us. The default would then leave a request waiting about 100 seconds before the
    // dead socket is noticed. These make that detection quick and retire connections early.
    idle_timeout: 10,
    // Short-lived, so a connection that went stale is retired soon
    max_lifetime: 60,
    keep_alive: 5,
    connect_timeout: 10,
    // No pg_type lookup on every new connection (connections are short-lived, so that ran
    // thousands of times). It only teaches postgres.js to parse array columns; queries return
    // lists as json instead.
    fetch_types: false,
  };
  const client = postgres(url, options);
  // postgres.js only marks a transaction's connection as reserved when max_pipeline is above 0,
  // so with 0 every sql.begin fails with UNSAFE_TRANSACTION. Transactions run on their own small
  // pool with the default pipelining, which is harmless there: a transaction holds its connection.
  const transactionOptions = { ...options, max: 3, max_pipeline: 100 };
  const transactions = postgres(url, transactionOptions);
  client.begin = transactions.begin.bind(transactions) as Sql["begin"];
  const end = client.end.bind(client);
  client.end = async (endOptions?: Parameters<Sql["end"]>[0]) => {
    await Promise.all([end(endOptions), transactions.end(endOptions)]);
  };
  return client;
}

/**
 * During `next build` each query gets its own one-connection client, closed as soon as it's idle.
 * The build prerenders the public pages one after another in one process, and a shared pool
 * stalls there: the first page's queries answer, then every later one waits forever (a clean
 * build's pages then shipped without their content, and sitemap.xml failed Vercel's build at
 * Next's 60-second limit). A plain Node script with the same options never stalls, so it's
 * specific to the build; a fresh connection per query answers every time. About a hundred short
 * connections per build, and none once the site runs.
 */
const isBuild = () => process.env.NEXT_PHASE === "phase-production-build";

function createBuildClient(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, { prepare: false, max: 1, idle_timeout: 1, connect_timeout: 10, fetch_types: false });
}

/** Lazily created, so importing this module never needs DATABASE_URL (e.g. at build time). */
export function getSql(): Sql {
  if (isBuild()) return createBuildClient();
  if (globalForDb.clawholicsSql && globalForDb.clawholicsSqlSetup !== CLIENT_SETUP) {
    globalForDb.clawholicsSql.end({ timeout: 5 }).catch(() => {});
    globalForDb.clawholicsSql = undefined;
  }
  if (!globalForDb.clawholicsSql) {
    globalForDb.clawholicsSql = createClient();
    globalForDb.clawholicsSqlSetup = CLIENT_SETUP;
  }
  return globalForDb.clawholicsSql;
}

/**
 * True when the client answers a trivial query within `ms`. A client whose connections were
 * dropped without notice (seen after a laptop sleep or a network change) never answers: every
 * query queues behind the dead connections, and the database never sees them.
 */
export async function sqlResponds(sql: Sql | undefined = globalForDb.clawholicsSql, ms = 3000): Promise<boolean> {
  if (!sql) return true;
  // Working time, so a dev server busy compiling doesn't make healthy connections look dead
  const late = workingTimeWait(ms, false);
  try {
    return await Promise.race([sql`select 1`.then(() => true, () => false), late.promise]);
  } finally {
    late.cancel();
  }
}

/**
 * Logs what the database itself is doing, over a separate one-off connection: the queries
 * running, waiting (e.g. on a lock) or left open in a transaction. Called when a request stalls,
 * to tell a busy or blocked database from connections that stopped answering on our side.
 */
export async function logDatabaseActivity(label: string) {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const probe = postgres(url, { prepare: false, max: 1, connect_timeout: 5, idle_timeout: 1, fetch_types: false });
  try {
    const rows = await probe<{ pid: number; state: string; wait: string | null; secs: number; query: string }[]>`
      select pid, state, coalesce(wait_event_type || ':' || wait_event, '') as wait,
        extract(epoch from now() - coalesce(xact_start, query_start))::int as secs,
        left(regexp_replace(query, '\\s+', ' ', 'g'), 120) as query
      from pg_stat_activity
      where datname = current_database() and pid <> pg_backend_pid() and backend_type = 'client backend'
        and (state <> 'idle' or wait_event_type = 'Lock')
      order by secs desc nulls last limit 15
    `;
    console.error(`[db] activity while ${label}:`, rows.length ? JSON.stringify(rows) : "nothing running or waiting in the database");
  } catch (error) {
    console.error(`[db] couldn't read the database activity while ${label}:`, error);
  } finally {
    await probe.end({ timeout: 1 }).catch(() => {});
  }
}

/** The client in use now, if one was opened (to check it, then reset that same one) */
export const currentSql = () => globalForDb.clawholicsSql;

/**
 * Drops the client and its connections; the next getSql() opens new ones. Given the client
 * that was found dead, it only drops that one, so several requests that found it dead at once
 * don't also drop the new client the first of them opened.
 */
export function resetSql(dead: Sql | undefined = globalForDb.clawholicsSql) {
  if (!dead || globalForDb.clawholicsSql !== dead) return;
  globalForDb.clawholicsSql = undefined;
  // A few seconds' grace instead of cutting every socket at once: a connection cut in the middle
  // of logging in counts as a failed login at Supabase's pooler, and after several of those it
  // refuses all new connections for a couple of minutes (ECIRCUITBREAKER).
  dead.end({ timeout: 5 }).catch(() => {});
}
