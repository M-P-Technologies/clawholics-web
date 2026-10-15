import { describe, expect, it } from "vitest";
import { artistsFact, priceLabel, shortPriceLabel } from "@/lib/client/servicePrice";
import { fillName, isBirthdayMonth } from "@/lib/client/birthday";
import { homeOffers } from "@/lib/client/offers";
import { readHomeSections } from "@/lib/homeSections";

const tiered = { pricing_type: "tiered" as const, master_price: 900, junior_price: 600, price: 0, variants: [] };
const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 800, variants: [] };

describe("service prices", () => {
  it("shows a range for master and junior prices", () => {
    expect(priceLabel(tiered)).toBe("₱600 – ₱900");
    expect(shortPriceLabel(tiered)).toBe("from ₱600");
  });
  it("shows one price for flat pricing", () => {
    expect(priceLabel(flat)).toBe("₱800");
    expect(shortPriceLabel(flat)).toBe("₱800");
  });
  it("shows the cheapest variant", () => {
    const s = { ...flat, variants: [{ id: 1, price: 700 }, { id: 2, price: 500 }] };
    expect(priceLabel(s)).toBe("from ₱500");
  });
  it("shows nothing rather than ₱0 when no price is set", () => {
    const none = { pricing_type: "tiered" as const, master_price: 0, junior_price: 0, price: 0, variants: [] };
    expect(priceLabel(none)).toBe("");
    expect(shortPriceLabel(none)).toBe("");
  });
  it("names master and junior only when both are offered", () => {
    expect(artistsFact(tiered)).toBe("Master & Junior");
    expect(artistsFact({ ...tiered, junior_price: 0 })).toBe("Our team");
    expect(artistsFact(flat)).toBe("Our team");
  });
});

describe("birthday month", () => {
  const at = (iso: string) => Date.parse(iso);
  it("is true in the birth month, in Manila time", () => {
    expect(isBirthdayMonth("1998-10-25", at("2026-10-14T08:00:00+08:00"))).toBe(true);
    // 23:30 UTC on Sep 30 is already Oct 1 in Manila
    expect(isBirthdayMonth("1998-10-01", at("2026-09-30T23:30:00Z"))).toBe(true);
    expect(isBirthdayMonth("1998-11-01", at("2026-10-14T08:00:00+08:00"))).toBe(false);
  });
  it("is false for a missing or malformed date", () => {
    expect(isBirthdayMonth(null, Date.now())).toBe(false);
    expect(isBirthdayMonth("10/25/1998", Date.now())).toBe(false);
  });
  it("puts the first name in, or 'there'", () => {
    expect(fillName("Happy birthday, {name}!", "Ana")).toBe("Happy birthday, Ana!");
    expect(fillName("Happy birthday, {name}!", " ")).toBe("Happy birthday, there!");
  });
});

describe("home offers", () => {
  const now = Date.parse("2026-10-14T08:00:00+08:00");
  const offer = { title: "20% off", line: "On gel", note: "This weekend", image: "", buttonLabel: "Book now", link: "/my/explore" };
  const sections = (extra: Record<string, string> = {}) => readHomeSections({ home_offers: JSON.stringify([offer]), ...extra });

  it("puts the birthday banner first in the birthday month", () => {
    const list = homeOffers({ sections: sections(), dob: "1998-10-25", firstName: "Ana", now });
    expect(list.map((o) => o.title)).toEqual(["Happy birthday, Ana!", "20% off"]);
    expect(list[0].birthday).toBe(true);
    expect(list[0].link).toBe("/my/explore");
  });
  it("leaves the birthday banner out in other months, or when switched off", () => {
    expect(homeOffers({ sections: sections(), dob: "1998-03-02", firstName: "Ana", now }).map((o) => o.title)).toEqual(["20% off"]);
    expect(homeOffers({ sections: sections({ home_birthday_enabled: "0" }), dob: "1998-10-25", firstName: "Ana", now }).map((o) => o.title)).toEqual(["20% off"]);
  });
  it("is empty with no offers and no birthday", () => {
    expect(homeOffers({ sections: readHomeSections({}), dob: null, firstName: "Ana", now })).toEqual([]);
  });
});
