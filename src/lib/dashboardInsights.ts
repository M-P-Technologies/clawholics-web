import type { DashboardResponse } from "../services/dashboardTypes";
import { LAPSED_DAYS, type DashboardRange } from "./dashboardPeriods";
import { peso } from "./dashboardFormat";

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
// below, so it can be tested and never says something the data does not show.
const MIN_BOOKINGS = 3; // bookings in both periods together, before anything is compared
const MOVE_PCT = 10; // a move of this much (percent) is a win or a watch-out
const MOVE_PTS = 5; // the same for a rate, in percentage points
const HIGH_CANCELLATION = 0.15;
const LOW_CONVERSION = 0.6;
const QUIET_DAY_SHARE = 0.4; // a weekday with under this share of the daily average is "quiet"
const DOMINANT_ARTIST = 0.7;
const MAX_PER_COLUMN = 3;

const WORDS: Record<DashboardRange, { title: string; now: string; prev: string }> = {
  week: { title: "This week at a glance", now: "this week", prev: "last week" },
  month: { title: "This month at a glance", now: "this month", prev: "last month" },
  last30: { title: "The last 30 days at a glance", now: "in the last 30 days", prev: "the 30 days before" },
  last90: { title: "The last 3 months at a glance", now: "in the last 3 months", prev: "the 3 months before" },
  year: { title: "This year at a glance", now: "this year", prev: "last year" },
};

export const insightTitle = (range: DashboardRange) => WORDS[range].title;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Percent change against the previous period; null when there is nothing to compare with
const pct = (value: number, previous: number) => (previous > 0 ? Math.round(((value - previous) / previous) * 100) : null);
const rounded = (fraction: number) => Math.round(fraction * 100);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// The sentences that only restate a stat card ("Collected is down 40%")
const KPI_IDS = new Set(["collected", "sales", "bookings", "clients"]);

export interface InsightOptions {
  /** false leaves out the sentences that only repeat a stat card, for a page that shows the cards */
  repeatKpis?: boolean;
}

export function buildInsights(data: DashboardResponse, { repeatKpis = true }: InsightOptions = {}): Insights {
  const { kpis, rates, attention } = data;
  const words = WORDS[data.range];
  const enough = kpis.bookings.value + kpis.bookings.previous >= MIN_BOOKINGS;

  const wins: Insight[] = [];
  const watch: Insight[] = [];
  const tips: Tip[] = [];

  const proofs = attention.proofsToReview;
  const lapsed = data.lapsedClients;
  const proofsWatch = () => {
    if (proofs > 0) watch.push({ id: "proofs", text: `${proofs} ${plural(proofs, "payment proof is", "payment proofs are")} waiting for review.` });
  };
  const lapsedWatch = () => {
    if (lapsed > 0) watch.push({ id: "lapsed", text: `${lapsed} ${plural(lapsed, "client hasn't", "clients haven't")} visited in over ${LAPSED_DAYS} days.` });
  };
  const proofsTip = () => {
    if (proofs > 0) {
      tips.push({
        id: "proofs",
        text: `Review ${proofs} ${plural(proofs, "payment proof so that booking gets", "payment proofs so those bookings get")} confirmed.`,
        to: "/appointments?status=PROOF_PENDING",
        cta: "Review proofs",
      });
    }
  };
  const lapsedTip = () => {
    if (lapsed > 0) {
      tips.push({
        id: "lapsed",
        text: `Message the ${plural(lapsed, "client who hasn't", `${lapsed} clients who haven't`)} visited in over ${LAPSED_DAYS} days with a comeback offer.`,
        to: "/client-directory",
        cta: "Open clients",
      });
    }
  };

  // Without enough bookings there is nothing fair to compare, but waiting proofs and lapsed
  // clients are facts, so they are still worth saying.
  if (!enough) {
    proofsWatch();
    lapsedWatch();
    proofsTip();
    lapsedTip();
    return {
      status: "no-data",
      headline: "Not enough data yet for insights.",
      wins,
      watch: watch.slice(0, MAX_PER_COLUMN),
      tips: tips.slice(0, MAX_PER_COLUMN),
    };
  }

  // ---- wins
  const collectedPct = pct(kpis.collected.value, kpis.collected.previous);
  const salesPct = pct(kpis.estimatedSales.value, kpis.estimatedSales.previous);
  const bookingsPct = pct(kpis.bookings.value, kpis.bookings.previous);
  const clientsPct = pct(kpis.newClients.value, kpis.newClients.previous);

  if (collectedPct !== null && collectedPct >= MOVE_PCT) wins.push({ id: "collected", text: `Collected ${peso(kpis.collected.value)}, up ${collectedPct}% on ${words.prev}.` });
  if (salesPct !== null && salesPct >= MOVE_PCT) wins.push({ id: "sales", text: `Estimated sales reached ${peso(kpis.estimatedSales.value)}, up ${salesPct}%.` });
  if (bookingsPct !== null && bookingsPct >= MOVE_PCT) wins.push({ id: "bookings", text: `${kpis.bookings.value} bookings, up ${bookingsPct}% on ${words.prev}.` });
  if (clientsPct !== null && clientsPct >= MOVE_PCT) wins.push({ id: "clients", text: `${kpis.newClients.value} new clients, up ${clientsPct}% on ${words.prev}.` });

  if (data.range === "month" && data.monthly.length > 1) {
    const latest = data.monthly[data.monthly.length - 1].completed;
    const best = Math.max(...data.monthly.slice(0, -1).map((m) => m.completed));
    if (latest > 0 && latest > best) wins.push({ id: "best-month", text: `Your best month in the last six: ${latest} completed bookings.` });
  }

  const cancel = rates.cancellation;
  const cancelNow = cancel.value === null ? null : rounded(cancel.value);
  const cancelBefore = cancel.previous === null ? null : rounded(cancel.previous);
  if (cancelNow !== null && cancelBefore !== null && cancelBefore - cancelNow >= MOVE_PTS) {
    wins.push({ id: "cancellations", text: `Cancellations fell to ${cancelNow}% (from ${cancelBefore}%).` });
  }

  const back = rates.returning;
  const backNow = back.value === null ? null : rounded(back.value);
  const backBefore = back.previous === null ? null : rounded(back.previous);
  if (backNow !== null && backBefore !== null && backNow - backBefore >= MOVE_PTS) {
    wins.push({ id: "returning", text: `More clients are coming back: ${backNow}% returned (was ${backBefore}%).` });
  }

  const avgPct = rates.averageSale.value !== null && rates.averageSale.previous !== null ? pct(rates.averageSale.value, rates.averageSale.previous) : null;
  if (avgPct !== null && avgPct >= MOVE_PCT) {
    wins.push({ id: "average", text: `The average sale rose to ${peso(rates.averageSale.value ?? 0)} (from ${peso(rates.averageSale.previous ?? 0)}).` });
  }

  if (data.loyalty.redeemed > 0) {
    const n = data.loyalty.redeemed;
    wins.push({ id: "loyalty", text: `${n} loyalty ${plural(n, "reward was", "rewards were")} redeemed.` });
  }

  // ---- watch-outs
  if (collectedPct !== null && collectedPct <= -MOVE_PCT) watch.push({ id: "collected", text: `Collected is down ${-collectedPct}% on ${words.prev} (${peso(kpis.collected.value)} vs ${peso(kpis.collected.previous)}).` });
  if (salesPct !== null && salesPct <= -MOVE_PCT) watch.push({ id: "sales", text: `Estimated sales are down ${-salesPct}% on ${words.prev} (${peso(kpis.estimatedSales.value)} vs ${peso(kpis.estimatedSales.previous)}).` });
  if (bookingsPct !== null && bookingsPct <= -MOVE_PCT) watch.push({ id: "bookings", text: `Bookings are down ${-bookingsPct}% on ${words.prev} (${kpis.bookings.value} vs ${kpis.bookings.previous}).` });
  if (clientsPct !== null && clientsPct <= -MOVE_PCT) watch.push({ id: "clients", text: `New clients are down ${-clientsPct}% on ${words.prev} (${kpis.newClients.value} vs ${kpis.newClients.previous}).` });

  const cancellationHigh = cancel.value !== null && cancel.value >= HIGH_CANCELLATION;
  const cancellationRising = cancelNow !== null && cancelBefore !== null && cancelNow - cancelBefore >= MOVE_PTS;
  if (cancelNow !== null && (cancellationHigh || cancellationRising)) {
    const from = cancelBefore !== null && cancelNow > cancelBefore ? ` (up from ${cancelBefore}%)` : "";
    watch.push({ id: "cancellations", text: `${cancelNow}% of bookings were cancelled or refunded${from}.` });
  }

  const conversionLow = rates.conversion.value !== null && rates.conversion.value < LOW_CONVERSION;
  if (conversionLow && rates.conversion.value !== null) watch.push({ id: "conversion", text: `Only ${rounded(rates.conversion.value)}% of started bookings got paid.` });

  if (backNow !== null && backBefore !== null && backBefore - backNow >= MOVE_PTS) {
    watch.push({ id: "returning", text: `Fewer clients are coming back: ${backNow}% returned (was ${backBefore}%).` });
  }
  proofsWatch();
  lapsedWatch();

  // ---- suggestions, each tied to something found above
  proofsTip();
  lapsedTip();
  if (conversionLow) {
    tips.push({ id: "followup", text: "Follow up on pending bookings before they expire.", to: "/appointments?status=PENDING", cta: "Open pending" });
  }
  if (cancellationHigh || cancellationRising) {
    tips.push({ id: "reminder", text: "Send clients a reminder the day before to cut cancellations." });
  }

  const dayTotal = data.weekdays.reduce((sum, d) => sum + d.bookings, 0);
  if (dayTotal >= 2 * 7) {
    const quietest = data.weekdays.reduce((low, d) => (d.bookings < low.bookings ? d : low), data.weekdays[0]);
    if (quietest.bookings <= (dayTotal / 7) * QUIET_DAY_SHARE) {
      tips.push({ id: "quiet", text: `Try an offer on ${DAY_NAMES[quietest.weekday - 1]}s: it's your quietest day.` });
    }
  }

  const earner = data.services.filter((s) => s.name !== "Other").reduce<DashboardResponse["services"][number] | null>(
    (top, s) => (top === null || s.estimatedSales > top.estimatedSales ? s : top),
    null,
  );
  if (earner && earner.estimatedSales > 0) {
    tips.push({ id: "earner", text: `Feature ${earner.name} on the homepage: it earned the most (${peso(earner.estimatedSales)}).` });
  }

  const artistTotal = data.artists.reduce((sum, a) => sum + a.bookings, 0);
  if (data.artists.length >= 2 && artistTotal >= 6) {
    const top = data.artists[0];
    if (top.bookings / artistTotal >= DOMINANT_ARTIST) {
      tips.push({ id: "balance", text: `${top.name} has ${rounded(top.bookings / artistTotal)}% of bookings: promote your other artists to balance the load.` });
    }
  }

  // ---- the headline
  const collectedLine =
    collectedPct === null
      ? `${peso(kpis.collected.value)} collected ${words.now}.`
      : collectedPct > 0
        ? `${peso(kpis.collected.value)} collected ${words.now}, up ${collectedPct}% on ${words.prev}.`
        : collectedPct < 0
          ? `${peso(kpis.collected.value)} collected ${words.now}, down ${-collectedPct}% on ${words.prev}.`
          : `${peso(kpis.collected.value)} collected ${words.now}, level with ${words.prev}.`;

  // "Steady" is judged on everything found, so a strong period is never called steady just
  // because its news is on the cards; the three-per-column limit applies after the filter
  const quiet = wins.length === 0 && watch.length === 0 && tips.length === 0;
  const keep = <T extends Insight>(items: T[]) => (repeatKpis ? items : items.filter((item) => !KPI_IDS.has(item.id)));
  return {
    status: quiet ? "steady" : "normal",
    headline: quiet ? `Steady ${words.now}: nothing needs attention.` : collectedLine,
    wins: keep(wins).slice(0, MAX_PER_COLUMN),
    watch: keep(watch).slice(0, MAX_PER_COLUMN),
    tips: tips.slice(0, MAX_PER_COLUMN),
  };
}
