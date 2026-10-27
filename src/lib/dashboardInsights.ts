import type { DashboardResponse } from "../services/dashboardTypes";
import { LAPSED_DAYS } from "./dashboardPeriods";
import { WEEKDAY_NAMES, peso } from "./dashboardFormat";

export interface Insight {
  id: string;
  text: string;
}
export interface Tip extends Insight {
  to?: string;
  cta?: string;
}
export interface Insights {
  status: "no-data" | "steady" | "normal";
  headline: string;
  wins: Insight[];
  watch: Insight[];
  tips: Tip[];
}

// Fixed rules, not a model: every sentence comes from a number on the dashboard and a threshold
// below, so it can be tested and never says something the data does not show. These are about the
// chosen period (`data.overview`), plus what needs doing now; comparisons with the previous period
// are on the cards, next to their numbers.
const MIN_DECIDED = 3; // visits confirmed, completed, cancelled, refunded or no-show, before rates are judged
const HIGH_CANCELLATION = 0.15;
const LOW_CANCELLATION = 0.05;
const LOW_CONVERSION = 0.6;
const QUIET_DAY_SHARE = 0.4; // a weekday with under this share of the daily average is "quiet"
const DOMINANT_ARTIST = 0.7;
const MAX_PER_COLUMN = 3;


const rounded = (fraction: number) => Math.round(fraction * 100);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function buildInsights(data: DashboardResponse): Insights {
  const { overview, attention } = data;
  const wins: Insight[] = [];
  const watch: Insight[] = [];
  const tips: Tip[] = [];

  // What needs doing now: facts, worth saying however little data there is
  const proofs = attention.proofsToReview;
  const lapsed = data.lapsedClients;
  if (proofs > 0) watch.push({ id: "proofs", text: `${proofs} ${plural(proofs, "payment proof is", "payment proofs are")} waiting for review.` });
  if (lapsed > 0) watch.push({ id: "lapsed", text: `${lapsed} ${plural(lapsed, "client hasn't", "clients haven't")} visited in over ${LAPSED_DAYS} days.` });
  if (proofs > 0) {
    tips.push({
      id: "proofs",
      text: `Review ${proofs} ${plural(proofs, "payment proof so that booking gets", "payment proofs so those bookings get")} confirmed.`,
      to: "/clients?status=PROOF_PENDING",
      cta: "Review proofs",
    });
  }
  if (lapsed > 0) {
    tips.push({
      id: "lapsed",
      text: `Message the ${plural(lapsed, "client who hasn't", `${lapsed} clients who haven't`)} visited in over ${LAPSED_DAYS} days with a comeback offer.`,
      to: "/clients#clients",
      cta: "Open clients",
    });
  }

  // Without a few visits there is nothing fair to judge
  if (overview.decided < MIN_DECIDED) {
    return { status: "no-data", headline: "Not enough data yet for insights.", wins, watch: watch.slice(0, MAX_PER_COLUMN), tips: tips.slice(0, MAX_PER_COLUMN) };
  }

  // ---- wins
  if (overview.returningClients > 0) {
    const n = overview.returningClients;
    wins.push({ id: "returning", text: `${n} ${plural(n, "client has", "clients have")} come back for a second visit.` });
  }
  const cancel = overview.cancellation;
  if (cancel !== null && cancel < LOW_CANCELLATION) wins.push({ id: "cancellations", text: `Only ${rounded(cancel)}% of bookings were cancelled.` });
  if (overview.loyaltyRedeemed > 0) {
    const n = overview.loyaltyRedeemed;
    wins.push({ id: "loyalty", text: `${n} loyalty ${plural(n, "reward has", "rewards have")} been redeemed.` });
  }

  // ---- watch-outs
  const cancellationHigh = cancel !== null && cancel >= HIGH_CANCELLATION;
  if (cancellationHigh) watch.push({ id: "cancellations", text: `${rounded(cancel)}% of bookings were cancelled, refunded or no-shows.` });
  const conversion = overview.conversion;
  const conversionLow = conversion !== null && conversion < LOW_CONVERSION;
  if (conversionLow) watch.push({ id: "conversion", text: `Only ${rounded(conversion)}% of started bookings got paid.` });

  // ---- suggestions, each tied to something found above
  if (conversionLow) tips.push({ id: "followup", text: "Follow up on pending bookings before they expire.", to: "/clients?status=PENDING", cta: "Open pending" });
  if (cancellationHigh) tips.push({ id: "reminder", text: "Send clients a reminder the day before to cut cancellations." });

  const dayTotal = overview.weekdays.reduce((sum, d) => sum + d.bookings, 0);
  if (dayTotal >= 2 * 7) {
    const quietest = overview.weekdays.reduce((low, d) => (d.bookings < low.bookings ? d : low), overview.weekdays[0]);
    if (quietest.bookings <= (dayTotal / 7) * QUIET_DAY_SHARE) {
      tips.push({ id: "quiet", text: `Try an offer on ${WEEKDAY_NAMES[quietest.weekday - 1]}s: it's your quietest day.` });
    }
  }

  const earner = overview.services.filter((s) => s.name !== "Other").reduce<DashboardResponse["overview"]["services"][number] | null>(
    (top, s) => (top === null || s.estimatedSales > top.estimatedSales ? s : top),
    null,
  );
  if (earner && earner.estimatedSales > 0) {
    tips.push({ id: "earner", text: `Feature ${earner.name} on the homepage: it has earned the most (${peso(earner.estimatedSales)}).` });
  }

  const artistTotal = overview.artists.reduce((sum, a) => sum + a.bookings, 0);
  if (overview.artists.length >= 2 && artistTotal >= 6) {
    const top = overview.artists[0];
    if (top.bookings / artistTotal >= DOMINANT_ARTIST) {
      tips.push({ id: "balance", text: `${top.name} has ${rounded(top.bookings / artistTotal)}% of bookings: promote your other artists to balance the load.` });
    }
  }

  const quiet = wins.length === 0 && watch.length === 0 && tips.length === 0;
  return {
    status: quiet ? "steady" : "normal",
    headline: quiet ? "Steady: nothing needs attention." : "",
    wins: wins.slice(0, MAX_PER_COLUMN),
    watch: watch.slice(0, MAX_PER_COLUMN),
    tips: tips.slice(0, MAX_PER_COLUMN),
  };
}
