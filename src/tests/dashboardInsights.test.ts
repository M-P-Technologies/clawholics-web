import { describe, expect, it } from "vitest";
import { buildInsights, insightTitle } from "@/lib/dashboardInsights";
import type { DashboardResponse } from "@/services/dashboardTypes";

// A busy, steady period with nothing remarkable: no wins, no watch-outs, no tips
const steady = (): DashboardResponse => ({
  range: "month",
  period: { from: "2026-10-01", to: "2026-10-31" },
  previous: { from: "2026-09-01", to: "2026-09-30" },
  kpis: {
    collected: { value: 10000, previous: 10000 },
    estimatedSales: { value: 20000, previous: 20000 },
    bookings: { value: 20, previous: 20 },
    newClients: { value: 5, previous: 5 },
  },
  rates: {
    cancellation: { value: 0.05, previous: 0.05 },
    conversion: { value: 0.9, previous: 0.9 },
    returning: { value: 0.4, previous: 0.4 },
    averageSale: { value: 1000, previous: 1000 }, leadConversion: { value: 0.5, previous: 0.5 },
  },
  lapsedClients: 0, leads: { accounts: 4, booked: 2 }, clientBase: { clients: 5, lifetimeValue: 1120, churn: 0.2 }, totals: { clients: 17, services: 35, artists: 5, upcoming: 7, trend: [] }, sales: [],
  loyalty: { stamps: 0, redeemed: 0 },
  attention: { today: 0, proofsToReview: 0, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 },
  money: { balanceAtSalon: { value: 0, previous: 0 }, returningRevenue: { value: 0, previous: 0 }, lostToCancellations: { value: 0, previous: 0 }, bookedAhead: { value: 0, visits: 0, days: [] } },
  trend: { granularity: "day", points: [] },
  monthly: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month) => ({ month, completed: 20, cancelled: 1 })),
  services: [{ name: "Gel", bookings: 10, estimatedSales: 0 }, { name: "Art", bookings: 10, estimatedSales: 0 }],
  weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 3 })),
  artists: [{ name: "Jun", bookings: 10 }, { name: "Maxine", bookings: 10 }],
  outcomes: { confirmed: 5, completed: 15, pending: 0, cancelled: 1, refunded: 0 },
  next: [],
});

const withKpis = (over: Partial<DashboardResponse["kpis"]>, rest: Partial<DashboardResponse> = {}): DashboardResponse => ({
  ...steady(), ...rest, kpis: { ...steady().kpis, ...over },
});

describe("insight titles", () => {
  it("names the period", () => {
    expect(insightTitle("week")).toBe("This week at a glance");
    expect(insightTitle("month")).toBe("This month at a glance");
    expect(insightTitle("last30")).toBe("The last 30 days at a glance");
    expect(insightTitle("last90")).toBe("The last 3 months at a glance");
    expect(insightTitle("year")).toBe("This year at a glance");
  });
});

describe("buildInsights: a quiet, steady period", () => {
  it("says it is steady and finds nothing to flag", () => {
    const i = buildInsights(steady());
    expect(i.status).toBe("steady");
    expect(i.headline).toBe("Steady this month: nothing needs attention.");
    expect([i.wins, i.watch, i.tips]).toEqual([[], [], []]);
  });
});

describe("buildInsights: too little data", () => {
  const quiet = (): DashboardResponse => ({
    ...steady(),
    kpis: { collected: { value: 500, previous: 0 }, estimatedSales: { value: 800, previous: 0 }, bookings: { value: 1, previous: 1 }, newClients: { value: 1, previous: 0 } },
  });

  it("does not compare or praise, it says so", () => {
    const i = buildInsights(quiet());
    expect(i.status).toBe("no-data");
    expect(i.headline).toBe("Not enough data yet for insights.");
    expect(i.wins).toEqual([]);
  });

  it("still flags things that are facts rather than comparisons", () => {
    const i = buildInsights({ ...quiet(), attention: { today: 0, proofsToReview: 2, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 }, lapsedClients: 3 });
    expect(i.status).toBe("no-data");
    expect(i.watch.map((w) => w.text)).toEqual([
      "2 payment proofs are waiting for review.",
      "3 clients haven't visited in over 60 days.",
    ]);
    expect(i.tips.map((t) => t.to)).toEqual(["/clients?status=PROOF_PENDING", "/clients#clients"]);
  });
});

describe("buildInsights: wins", () => {
  it("praises money, bookings and clients that grew by 10% or more, with the real figures", () => {
    const i = buildInsights(withKpis({
      collected: { value: 2000, previous: 1000 },
      estimatedSales: { value: 3300, previous: 3000 }, // +10%
      bookings: { value: 22, previous: 20 }, // +10%
      newClients: { value: 6, previous: 5 }, // +20%
    }));
    expect(i.wins.map((w) => w.text)).toEqual([
      "Collected ₱2,000, up 100% on last month.",
      "Sales reached ₱3,300, up 10%.",
      "22 bookings, up 10% on last month.",
    ]);
  });

  it("never invents growth from nothing: a previous value of 0 is not a win", () => {
    const i = buildInsights(withKpis({ collected: { value: 5000, previous: 0 } }));
    expect(i.wins.some((w) => w.text.startsWith("Collected"))).toBe(false);
  });

  it("is not moved by changes under 10%", () => {
    const i = buildInsights(withKpis({ collected: { value: 10900, previous: 10000 } }));
    expect(i.wins).toEqual([]);
  });

  it("notices fewer cancellations and more returning clients", () => {
    const i = buildInsights({ ...steady(), rates: { ...steady().rates, cancellation: { value: 0.05, previous: 0.15 }, returning: { value: 0.5, previous: 0.4 } } });
    expect(i.wins.map((w) => w.text)).toEqual([
      "Cancellations fell to 5% (from 15%).",
      "More clients are coming back: 50% returned (was 40%).",
    ]);
  });

  it("celebrates a best month in six, only when looking at a month", () => {
    const monthly = steady().monthly.map((m, i, all) => ({ ...m, completed: i === all.length - 1 ? 30 : 20 }));
    expect(buildInsights({ ...steady(), monthly }).wins.map((w) => w.text)).toContain("Your best month in the last six: 30 completed bookings.");
    expect(buildInsights({ ...steady(), monthly, range: "week" }).wins.map((w) => w.text)).not.toContain("Your best month in the last six: 30 completed bookings.");
  });

  it("counts redeemed loyalty rewards", () => {
    const i = buildInsights({ ...steady(), loyalty: { stamps: 12, redeemed: 2 } });
    expect(i.wins.map((w) => w.text)).toEqual(["2 loyalty rewards were redeemed."]);
  });

  it("shows at most three, best first", () => {
    const i = buildInsights(withKpis(
      { collected: { value: 20000, previous: 10000 }, estimatedSales: { value: 40000, previous: 20000 }, bookings: { value: 40, previous: 20 }, newClients: { value: 10, previous: 5 } },
      { loyalty: { stamps: 3, redeemed: 4 } },
    ));
    expect(i.wins).toHaveLength(3);
    expect(i.wins[0].text.startsWith("Collected")).toBe(true);
  });
});

describe("buildInsights: watch-outs", () => {
  it("flags money and bookings that fell by 10% or more", () => {
    const i = buildInsights(withKpis({
      collected: { value: 6000, previous: 10000 },
      bookings: { value: 14, previous: 20 },
    }));
    expect(i.status).toBe("normal");
    expect(i.watch.map((w) => w.text)).toEqual([
      "Collected is down 40% on last month (₱6,000 vs ₱10,000).",
      "Bookings are down 30% on last month (14 vs 20).",
    ]);
    expect(i.headline).toBe("₱6,000 collected this month, down 40% on last month.");
  });

  it("flags a high or rising cancellation rate and suggests a reminder", () => {
    const i = buildInsights({ ...steady(), rates: { ...steady().rates, cancellation: { value: 0.2, previous: 0.05 } } });
    expect(i.watch.map((w) => w.text)).toContain("20% of bookings were cancelled or refunded (up from 5%).");
    expect(i.tips.map((t) => t.text)).toContain("Send clients a reminder the day before to cut cancellations.");
  });

  it("flags low booking conversion and points at the pending list", () => {
    const i = buildInsights({ ...steady(), rates: { ...steady().rates, conversion: { value: 0.4, previous: 0.9 } } });
    expect(i.watch.map((w) => w.text)).toContain("Only 40% of started bookings got paid.");
    const tip = i.tips.find((t) => t.to === "/clients?status=PENDING");
    expect(tip?.text).toBe("Follow up on pending bookings before they expire.");
  });

  it("uses singular and plural correctly", () => {
    const one = buildInsights({ ...steady(), attention: { today: 0, proofsToReview: 1, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 }, lapsedClients: 1 });
    expect(one.watch.map((w) => w.text)).toEqual(["1 payment proof is waiting for review.", "1 client hasn't visited in over 60 days."]);
  });

  it("shows at most three", () => {
    const i = buildInsights(withKpis(
      { collected: { value: 1, previous: 10000 }, estimatedSales: { value: 1, previous: 20000 }, bookings: { value: 1, previous: 20 }, newClients: { value: 1, previous: 5 } },
    ));
    expect(i.watch).toHaveLength(3);
  });
});

describe("buildInsights: suggestions", () => {
  it("puts the payment proofs first, linked to the filtered list", () => {
    const i = buildInsights({ ...steady(), attention: { today: 0, proofsToReview: 3, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 }, lapsedClients: 2 });
    expect(i.tips[0]).toEqual({
      id: "proofs", text: "Review 3 payment proofs so those bookings get confirmed.",
      to: "/clients?status=PROOF_PENDING", cta: "Review proofs",
    });
    expect(i.tips[1].to).toBe("/clients#clients");
    expect(i.tips[1].text).toBe("Message the 2 clients who haven't visited in over 60 days with a comeback offer.");
  });

  it("names the quietest weekday when there is enough data", () => {
    const weekdays = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: weekday === 1 ? 0 : 5 }));
    const i = buildInsights({ ...steady(), weekdays });
    expect(i.tips.map((t) => t.text)).toContain("Try an offer on Mondays: it's your quietest day.");
  });

  it("does not call a weekday quiet when they are all about the same", () => {
    expect(buildInsights(steady()).tips).toEqual([]);
  });

  it("recommends featuring the top earner, never the 'Other' bucket", () => {
    const services = [
      { name: "Other", bookings: 9, estimatedSales: 99999 },
      { name: "Soft Gel Extensions", bookings: 4, estimatedSales: 6000 },
      { name: "Gel", bookings: 10, estimatedSales: 2000 },
    ];
    const i = buildInsights({ ...steady(), services });
    expect(i.tips.map((t) => t.text)).toContain("Feature Soft Gel Extensions on the homepage: it earned the most (₱6,000).");
  });

  it("notices when one artist has most of the bookings", () => {
    const i = buildInsights({ ...steady(), artists: [{ name: "Jun", bookings: 16 }, { name: "Maxine", bookings: 4 }] });
    expect(i.tips.map((t) => t.text)).toContain("Jun has 80% of bookings: promote your other artists to balance the load.");
  });

  it("shows at most three, in priority order", () => {
    const weekdays = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: weekday === 1 ? 0 : 5 }));
    const i = buildInsights({
      ...steady(), weekdays, lapsedClients: 2,
      attention: { today: 0, proofsToReview: 1, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 },
      rates: { ...steady().rates, cancellation: { value: 0.3, previous: 0.05 } },
    });
    expect(i.tips.map((t) => t.id)).toEqual(["proofs", "lapsed", "reminder"]);
  });
});

describe("buildInsights: headline per period", () => {
  it("speaks in the period's own words", () => {
    const week = buildInsights({ ...withKpis({ collected: { value: 2000, previous: 1000 } }), range: "week" });
    expect(week.headline).toBe("₱2,000 collected this week, up 100% on last week.");
    const last30 = buildInsights({ ...withKpis({ collected: { value: 2000, previous: 1000 } }), range: "last30" });
    expect(last30.headline).toBe("₱2,000 collected in the last 30 days, up 100% on the 30 days before.");
  });
});

describe("buildInsights without repeating the stat cards", () => {
  it("leaves out the sentences that only repeat a card, and fills the three slots with the rest", () => {
    const i = buildInsights(
      withKpis(
        { collected: { value: 1, previous: 10000 }, estimatedSales: { value: 1, previous: 20000 }, bookings: { value: 1, previous: 20 }, newClients: { value: 1, previous: 5 } },
        { rates: { ...steady().rates, cancellation: { value: 0.3, previous: 0.05 } }, lapsedClients: 2 },
      ),
      { repeatKpis: false },
    );
    expect(i.watch.map((w) => w.id)).toEqual(["cancellations", "lapsed"]);
  });

  it("drops the card-repeating wins too, but a strong period is still not called steady", () => {
    const i = buildInsights(withKpis({ collected: { value: 20000, previous: 10000 } }), { repeatKpis: false });
    expect(i.wins).toEqual([]);
    expect(i.status).toBe("normal");
  });

  it("repeats them by default", () => {
    expect(buildInsights(withKpis({ collected: { value: 20000, previous: 10000 } })).wins.map((w) => w.id)).toEqual(["collected"]);
  });
});
