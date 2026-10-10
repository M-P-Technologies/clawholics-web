import "server-only";

// While the API moves from the Cloudflare Worker to these route handlers, both run side by
// side:
// - Paths with no route file reach the Worker through the fallback rewrite in next.config.ts.
// - A route file ports some methods; its other methods are `forwardToWorker`, so e.g. an
//   admin POST to a path whose GET is ported still reaches the Worker.
// - Ported handlers are wrapped in `ported()`. Until API_BACKEND=next (Phase 3 cutover, when
//   the data has moved to Supabase) they also just forward, so production keeps reading the
//   live D1 data.

type Handler<C> = (req: Request, context: C) => Response | Promise<Response>;

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
 */
export function ported<C>(handler: Handler<C>, { requireOrigin = true } = {}): Handler<C> {
  return async (req, context) => {
    if (!nextApiEnabled()) return forwardToWorker(req);
    if (requireOrigin && req.headers.get("x-clawholics-origin") !== "frontend") {
      return Response.json(
        { error: "Forbidden: Direct API access is disabled. Please use the official Clawholics website." },
        { status: 403 },
      );
    }
    try {
      return await handler(req, context);
    } catch (error) {
      console.error(`[api] ${req.method} ${new URL(req.url).pathname} failed:`, error);
      return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
