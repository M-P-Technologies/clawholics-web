import { describe, expect, it } from "vitest";
import { estimateTotal, startingPrice, type Priceable } from "../services/pricing";

describe("startingPrice", () => {
  it("uses the lowest offered tier price for a tiered service", () => {
    expect(startingPrice({ pricing_type: "tiered", master_price: 800, junior_price: 650, price: 0, variants: [] })).toBe(650);
  });

  it("ignores a tier that is not offered (0)", () => {
    expect(startingPrice({ pricing_type: "tiered", master_price: 0, junior_price: 250, price: 0, variants: [] })).toBe(250);
    expect(startingPrice({ pricing_type: "tiered", master_price: 350, junior_price: 0, price: 0, variants: [] })).toBe(350);
  });

  it("uses the flat price", () => {
    expect(startingPrice({ pricing_type: "flat", master_price: 0, junior_price: 0, price: 650, variants: [] })).toBe(650);
  });

  it("uses the cheapest variant when there are variants", () => {
    expect(
      startingPrice({
        pricing_type: "flat", master_price: 0, junior_price: 0, price: 0,
        variants: [{ price: 650 }, { price: 550 }],
      }),
    ).toBe(550);
  });

  it("returns null when nothing is priced", () => {
    expect(startingPrice({ pricing_type: "tiered", master_price: 0, junior_price: 0, price: 0, variants: [] })).toBeNull();
  });

  it("works for an old service object with no new fields", () => {
    const legacyService: Partial<Priceable> = { master_price: 800, junior_price: 650 };
    expect(startingPrice(legacyService as Priceable)).toBe(650);
  });
});

describe("estimateTotal", () => {
  const service = { pricing_type: "tiered" as const, master_price: 800, junior_price: 650, price: 0, variants: [] };

  it("adds checked add-ons to the artist tier price", () => {
    expect(estimateTotal({ service, isMaster: true, variantId: null, addons: [{ id: 1, price: 200 }, { id: 2, price: 150 }], addonIds: [1] })).toBe(1000);
  });

  it("uses the selected variant instead of the tier price", () => {
    const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 0, variants: [{ id: 5, price: 650 }] };
    expect(estimateTotal({ service: flat, isMaster: false, variantId: 5, addons: [], addonIds: [] })).toBe(650);
  });

  it("returns the flat price for a flat service with no options", () => {
    const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 650, variants: [] };
    expect(estimateTotal({ service: flat, isMaster: false, variantId: null, addons: [], addonIds: [] })).toBe(650);
  });

  it("uses the tier that is set when the artist's own tier is not offered", () => {
    const noMaster = { pricing_type: "tiered" as const, master_price: 0, junior_price: 250, price: 0, variants: [] };
    expect(estimateTotal({ service: noMaster, isMaster: true, variantId: null, addons: [], addonIds: [] })).toBe(250);
  });

  it("adds a variant and an add-on together for a flat service", () => {
    const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 0, variants: [{ id: 5, price: 650 }] };
    expect(estimateTotal({ service: flat, isMaster: false, variantId: 5, addons: [{ id: 1, price: 150 }], addonIds: [1] })).toBe(800);
  });

  it("returns null until a required variant is chosen", () => {
    const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 0, variants: [{ id: 5, price: 650 }] };
    expect(estimateTotal({ service: flat, isMaster: false, variantId: null, addons: [], addonIds: [] })).toBeNull();
  });
});
