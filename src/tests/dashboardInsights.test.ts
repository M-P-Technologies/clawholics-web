import { describe, expect, it } from "vitest";
import { buildInsights } from "@/lib/dashboardInsights";
import type { DashboardResponse } from "@/services/dashboardTypes";
import { dashboardData } from "./dashboardFixture";

// A busy, steady salon with nothing remarkable over all time: no wins, no watch-outs, no tips
const steady = (overview: Partial<DashboardResponse["overview"]> = {}, rest: Partial<DashboardResponse> = {}): DashboardResponse => ({
  ...dashboardData,
  lapsedClients: 0,
  attention: { today: 0, proofsToReview: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 },
  ...rest,
  overview: {
    services: [{ name: "Gel", bookings: 10, estimatedSales: 0 }, { name: "Art", bookings: 10, estimatedSales: 0 }],
    weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 3 })),
    artists: [{ name: "Jun", bookings: 10 }, { name: "Maxine", bookings: 10 }],
    decided: 20, cancellation: 0.1, conversion: 0.9, returningClients: 0, loyaltyRedeemed: 0,
    ...overview,
  },
});
const texts = (items: { text: string }[]) => items.map((i) => i.text);

describe("buildInsights: a steady salon", () => {
  it("says nothing needs attention", () => {
    const i = buildInsights(steady());
    expect(i.status).toBe("steady");
    expect(i.headline).toBe("Steady: nothing needs attention.");
    expect([i.wins, i.watch, i.tips]).toEqual([[], [], []]);
  });

  it("never compares with a previous period, whatever the period's numbers", () => {
    const i = buildInsights(steady({}, { rates: { ...dashboardData.rates, cancellation: { value: 0, previous: 0.9 } } }));
    expect(i.status).toBe("steady");
  });
});

describe("buildInsights: too little data", () => {
  it("judges nothing with fewer than three decided visits, but still says what needs doing", () => {
    const i = buildInsights(steady({ decided: 2, cancellation: 0.5 }, { lapsedClients: 3, attention: { ...steady().attention, proofsToReview: 2 } }));
    expect(i.status).toBe("no-data");
    expect(i.headline).toBe("Not enough data yet for insights.");
    expect(texts(i.watch)).toEqual(["2 payment proofs are waiting for review.", "3 clients haven't visited in over 60 days."]);
    expect(i.tips.map((t) => t.id)).toEqual(["proofs", "lapsed"]);
  });
});

describe("buildInsights: wins", () => {
  it("counts returning clients, low cancellations and rewards redeemed", () => {
    const i = buildInsights(steady({ returningClients: 4, cancellation: 0.02, loyaltyRedeemed: 1 }));
    expect(texts(i.wins)).toEqual([
      "4 clients have come back for a second visit.",
      "Only 2% of bookings were cancelled.",
      "1 loyalty reward has been redeemed.",
    ]);
  });

  it("speaks of one client in the singular", () => {
    expect(texts(buildInsights(steady({ returningClients: 1 })).wins)).toEqual(["1 client has come back for a second visit."]);
  });
});

describe("buildInsights: watch-outs and what to try", () => {
  it("flags a high cancellation rate, with a reminder to try", () => {
    const i = buildInsights(steady({ cancellation: 0.2 }));
    expect(texts(i.watch)).toEqual(["20% of bookings were cancelled, refunded or no-shows."]);
    expect(i.tips.map((t) => t.id)).toEqual(["reminder"]);
  });

  it("flags low booking conversion, without a tip (a pending booking is only a hold while the client pays)", () => {
    const i = buildInsights(steady({ conversion: 0.4 }));
    expect(texts(i.watch)).toEqual(["Only 40% of started bookings got paid."]);
    expect(i.tips).toEqual([]);
  });

  it("links waiting proofs and lapsed clients to where to act on them", () => {
    const i = buildInsights(steady({}, { lapsedClients: 1, attention: { ...steady().attention, proofsToReview: 1 } }));
    expect(texts(i.watch)).toEqual(["1 payment proof is waiting for review.", "1 client hasn't visited in over 60 days."]);
    expect(i.tips.map((t) => [t.id, t.to])).toEqual([["proofs", "/clients?status=PROOF_PENDING"], ["lapsed", "/clients#clients"]]);
  });

  it("suggests an offer on the quietest weekday", () => {
    const weekdays = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: weekday === 2 ? 0 : 5 }));
    expect(texts(buildInsights(steady({ weekdays })).tips)).toEqual(["Try an offer on Tuesdays: it's your quietest day."]);
  });

  it("suggests featuring the service that has earned the most", () => {
    const services = [{ name: "Gel", bookings: 10, estimatedSales: 5000 }, { name: "Art", bookings: 12, estimatedSales: 3000 }, { name: "Other", bookings: 30, estimatedSales: 9000 }];
    expect(texts(buildInsights(steady({ services })).tips)).toEqual(["Feature Gel on the homepage: it has earned the most (₱5,000)."]);
  });

  it("suggests balancing the load when one artist has most of the bookings", () => {
    const i = buildInsights(steady({ artists: [{ name: "Jun", bookings: 16 }, { name: "Maxine", bookings: 4 }] }));
    expect(texts(i.tips)).toEqual(["Jun has 80% of bookings: promote your other artists to balance the load."]);
  });

  it("keeps each column to three", () => {
    const weekdays = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: weekday === 2 ? 0 : 5 }));
    const i = buildInsights(steady(
      { cancellation: 0.3, conversion: 0.3, weekdays, artists: [{ name: "Jun", bookings: 16 }, { name: "Maxine", bookings: 4 }] },
      { lapsedClients: 2, attention: { ...steady().attention, proofsToReview: 1 } },
    ));
    expect(i.watch).toHaveLength(3);
    expect(i.tips).toHaveLength(3);
  });
});
