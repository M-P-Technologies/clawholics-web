import "server-only";

// Request rate limits, checked by ported() before any handler runs: a generous ceiling on every
// API request from one visitor, and stricter ones on the endpoints that send email, create
// bookings or payments, or store uploads. Counts are kept in this server instance's memory, so on
// Vercel (several instances) they're a best-effort first line; the Vercel Firewall's rate limit
// rule is the one that holds across instances.

interface Rule {
  /** Requests allowed in the window */
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;

/** Every API request from one visitor */
const EVERY_REQUEST: Rule = { limit: 300, windowMs: MINUTE };

/** Stricter limits by method and path (exact match) */
const STRICT: Record<string, Rule> = {
  // Sends the salon an email
  "POST /api/submit": { limit: 5, windowMs: 10 * MINUTE },
  "POST /api/booking/create": { limit: 10, windowMs: 10 * MINUTE },
  // Creates a Xendit invoice
  "POST /api/payment/create": { limit: 10, windowMs: 10 * MINUTE },
  "POST /api/payment/proofs": { limit: 10, windowMs: 10 * MINUTE },
  "POST /api/reviews": { limit: 10, windowMs: 10 * MINUTE },
  "POST /api/upload/image": { limit: 60, windowMs: 10 * MINUTE },
};

/** Not limited: Xendit's servers call the webhook, and Vercel Cron the voucher run */
const EXEMPT = new Set(["POST /api/payment/webhook", "GET /api/cron/birthday-vouchers"]);

/** When each visitor's recent requests were made, by "<rule>|<ip>" */
const hits = new Map<string, number[]>();
const MAX_TRACKED = 20_000;

/** The visitor's address as Vercel passes it on (the first in x-forwarded-for) */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Records the request; true when it's over the rule's limit */
function overLimit(key: string, rule: Rule, now: number): { blocked: boolean; retryAfter: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  if (recent.length >= rule.limit) {
    hits.set(key, recent);
    return { blocked: true, retryAfter: Math.ceil((recent[0] + rule.windowMs - now) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { blocked: false, retryAfter: 0 };
}

/** Drops visitors with nothing recent once the map gets big, so memory stays bounded */
function prune(now: number) {
  if (hits.size < MAX_TRACKED) return;
  for (const [key, times] of hits) {
    if (!times.length || now - times[times.length - 1] > 10 * MINUTE) hits.delete(key);
  }
  if (hits.size >= MAX_TRACKED) hits.clear();
}

/** A 429 answer when this request is over a limit, otherwise null. Off under the test runner,
 *  whose handler tests send many requests from one made-up visitor; rateLimit's own tests turn
 *  it on. */
export function rateLimited(req: Request, now = Date.now(), enabled = process.env.NODE_ENV !== "test"): Response | null {
  if (!enabled) return null;
  const route = `${req.method} ${new URL(req.url).pathname.replace(/\/+$/, "")}`;
  if (EXEMPT.has(route)) return null;
  prune(now);
  const ip = clientIp(req);
  const strict = STRICT[route];
  const checks: [string, Rule][] = [["all", EVERY_REQUEST], ...(strict ? [[route, strict] as [string, Rule]] : [])];
  for (const [name, rule] of checks) {
    const { blocked, retryAfter } = overLimit(`${name}|${ip}`, rule, now);
    if (blocked) {
      return Response.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } },
      );
    }
  }
  return null;
}

/** For tests: forget every count */
export function resetRateLimits() {
  hits.clear();
}
