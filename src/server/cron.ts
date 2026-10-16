import "server-only";
import { timingSafeEqual } from "node:crypto";

// Vercel Cron calls (vercel.json) carry `Authorization: Bearer $CRON_SECRET`; without
// CRON_SECRET set, every call is refused.
const sameSecret = (given: string, expected: string) => {
  const [a, b] = [Buffer.from(given), Buffer.from(expected)];
  return a.length === b.length && timingSafeEqual(a, b);
};

export function isCronCall(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`);
}
