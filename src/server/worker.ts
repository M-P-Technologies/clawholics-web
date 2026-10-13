import "server-only";

// While the API moves from the Cloudflare Worker to these route handlers, both run side by
// side:
// - Paths with no route file reach the Worker through the fallback rewrite in next.config.ts.
// - A route file ports some methods; its other methods are `forwardToWorker`, so e.g. an
//   admin POST to a path whose GET is ported still reaches the Worker.
// - Ported handlers are wrapped in `ported()`. Until API_BACKEND=next (Phase 3 cutover, when
//   the data has moved to Supabase) they also just forward, so production keeps reading the
//   live D1 data.

import { currentSql, logDatabaseActivity, resetSql, sqlResponds } from "./db";
import { workingTimeWait } from "./loopTimer";

type Handler<C> = (req: Request, context: C) => Response | Promise<Response>;

/** How long a ported request may take before it's answered with a 503 instead */
export const REQUEST_TIMEOUT_MS = 30_000;
/** How long a request may wait before the database connections are checked */
export const STALL_CHECK_MS = 10_000;

// Working time, not wall time: see workingTimeWait
const wait = workingTimeWait;

// Retrying is only safe for requests that change nothing
const isRead = (req: Request) => req.method === "GET" || req.method === "HEAD";

/** How long the check of a stalled request's connections may take. Generous, because a busy dev
 *  server (compiling routes) can be slow to answer even on healthy connections. */
const CHECK_MS = 8_000;

// postgres.js and Node codes for a connection that broke or was closed under a query
const CONNECTION_ERRORS = new Set(["CONNECTION_DESTROYED", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECT_TIMEOUT", "ECONNRESET", "EPIPE", "ETIMEDOUT"]);
const isConnectionError = (error: unknown) =>
  !!error && typeof error === "object" && CONNECTION_ERRORS.has(String((error as { code?: unknown }).code));

const workerBase = () => process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const HOP_BY_HOP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "expect",
  "proxy-authorization",
  "proxy-connection",
  // fetch decompresses the body; let the client get it uncompressed rather than mislabelled
  "accept-encoding",
  "content-length",
]);

export const nextApiEnabled = () => process.env.API_BACKEND === "next";

/** Sends the request to the Worker unchanged and returns its response. */
export async function forwardToWorker(req: Request): Promise<Response> {
  const base = workerBase();
  if (!base) return Response.json({ message: "API_PROXY_TARGET is not set" }, { status: 502 });

  const url = new URL(req.url);
  const target = `${base}${url.pathname.replace(/^\/api(?=\/|$)/, "")}${url.search}`;

  const headers = new Headers(req.headers);
  for (const name of [...headers.keys()]) {
    // Connection-level headers belong to the incoming hop (fetch rejects some of them), and
    // x-clerk-* are clerkMiddleware's internal headers, which carry the session token.
    if (HOP_BY_HOP_HEADERS.has(name) || name.startsWith("x-clerk-") || name.startsWith("x-middleware-")) {
      headers.delete(name);
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const res = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const resHeaders = new Headers(res.headers);
  resHeaders.delete("content-encoding");
  resHeaders.delete("content-length");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: resHeaders });
}

/**
 * Runs the Next handler once API_BACKEND=next; before that, forwards to the Worker.
 * Keeps the Worker's request gate (the x-clawholics-origin header) and its JSON 500.
 * `requireOrigin: false` is for callers that aren't the frontend (the Xendit webhook),
 * which the Worker also exempts.
 *
 * The database connections can die without notice (after a long quiet spell, a sleep or a
 * network change), and then every query waits forever. So a request still waiting after
 * STALL_CHECK_MS has the connections checked: if they don't answer a trivial query, they're
 * replaced. Either way a read is run once more (a single connection can die while the others
 * still work), and the first answer wins. Anything still unanswered at
 * REQUEST_TIMEOUT_MS gets a 503, so the page shows its error and retry instead of loading
 * forever. */
export function ported<C>(handler: Handler<C>, { requireOrigin = true } = {}): Handler<C> {
  return async (req, context) => {
    if (!nextApiEnabled()) return forwardToWorker(req);
    if (requireOrigin && req.headers.get("x-clawholics-origin") !== "frontend") {
      return Response.json(
        { error: "Forbidden: Direct API access is disabled. Please use the official Clawholics website." },
        { status: 403 },
      );
    }
    const path = new URL(req.url).pathname;
    const startedAt = Date.now();
    const deadline = wait(REQUEST_TIMEOUT_MS, "timeout" as const);
    const stallCheck = wait(STALL_CHECK_MS, "check" as const);
    const tooSlow = Response.json({ error: "The server took too long to answer. Please try again." }, { status: 503 });
    // A read whose connection broke under it (e.g. connections replaced by another request's
    // check) runs once more, on new ones; a write never runs twice
    const attempt = () => {
      const once = () => Promise.resolve().then(() => handler(req, context));
      return isRead(req) ? once().catch((error) => (isConnectionError(error) ? once() : Promise.reject(error))) : once();
    };
    try {
      const run = attempt();
      const first = await Promise.race([run, stallCheck.promise, deadline.promise]);
      if (first instanceof Response) return first;

      if (first === "check") {
        const client = currentSql();
        // The stall is counted in working time. If far more time passed on the clock, this
        // server was frozen meanwhile (the dev server compiling), which is not a database fault.
        const onTheClock = Math.round((Date.now() - startedAt) / 1000);
        if (onTheClock >= 2 * (STALL_CHECK_MS / 1000)) {
          console.error(`[api] ${req.method} ${path} stalled while this server was frozen for about ${onTheClock - STALL_CHECK_MS / 1000}s (busy compiling?)`);
        }
        // What the database was doing when this request stalled (logged in the background)
        void logDatabaseActivity(`${req.method} ${path} waited ${STALL_CHECK_MS / 1000}s`);
        const responds = await sqlResponds(client, CHECK_MS);
        if (!responds) {
          console.error(`[db] the database connections stopped answering (${req.method} ${path}); opening new ones`);
          resetSql(client);
        }
        if (isRead(req)) {
          // A read can simply run again: on new connections after a reset, or else on a healthy
          // one (a single connection can die while the rest still work). The first answer wins.
          run.catch(() => {});
          const again = attempt();
          again.catch(() => {});
          const result = await Promise.race(responds ? [run, again, deadline.promise] : [again, deadline.promise]);
          if (result instanceof Response) return result;
          console.error(`[api] ${req.method} ${path} took over ${REQUEST_TIMEOUT_MS / 1000}s`);
          return tooSlow;
        }
        const rest = await Promise.race([run, deadline.promise]);
        if (rest instanceof Response) return rest;
      }

      console.error(`[api] ${req.method} ${path} took over ${REQUEST_TIMEOUT_MS / 1000}s`);
      return tooSlow;
    } catch (error) {
      console.error(`[api] ${req.method} ${path} failed:`, error);
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    } finally {
      deadline.cancel();
      stallCheck.cancel();
    }
  };
}
