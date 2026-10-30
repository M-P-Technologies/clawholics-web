import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/seo";

// The link in a rebooking email that turns those emails off for a client. It carries their user id
// and a signature only the server can make (an HMAC of the id), so it can't be forged for another
// client. Keyed by CRON_SECRET, which the daily run that sends these emails needs anyway.

const sign = (userId: number): string | null => {
  const secret = process.env.CRON_SECRET;
  return secret ? createHmac("sha256", secret).update(`nudge-unsubscribe:${userId}`).digest("hex") : null;
};

/** The link that unsubscribes this client, or null when there's no secret to sign it with */
export function unsubscribeUrl(userId: number): string | null {
  const token = sign(userId);
  return token ? `${SITE_URL}/api/unsubscribe?u=${userId}&t=${token}` : null;
}

export function isValidUnsubscribe(userId: number, token: string): boolean {
  const expected = sign(userId);
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
