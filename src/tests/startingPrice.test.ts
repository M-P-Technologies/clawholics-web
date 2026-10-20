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

  it("ignores the options: they're extras on top of the service's price", () => {
    expect(
      startingPrice({
        pricing_type: "flat", master_price: 0, junior_price: 0, price: 400,
        variants: [{ price: 650 }, { price: 150 }],
      }),
    ).toBe(400);
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
    expect(estimateTotal({ service, isMaster: true, variantIds: [], addons: [{ id: 1, price: 200 }, { id: 2, price: 150 }], addonIds: [1] })).toBe(1000);
  });

  it("adds the options picked on top of the tier price", () => {
    const withOptions = { ...service, variants: [{ id: 5, price: 150 }, { id: 6, price: 100 }] };
    expect(estimateTotal({ service: withOptions, isMaster: false, variantIds: [5, 6], addons: [], addonIds: [] })).toBe(900);
  });

  it("returns the service's price when no option is picked: options are optional", () => {
    const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 650, variants: [{ id: 5, price: 150 }] };
    expect(estimateTotal({ service: flat, isMaster: false, variantIds: [], addons: [], addonIds: [] })).toBe(650);
  });

  it("returns null when the artist tier is not offered", () => {
    const noMaster = { pricing_type: "tiered" as const, master_price: 0, junior_price: 250, price: 0, variants: [] };
    expect(estimateTotal({ service: noMaster, isMaster: true, variantIds: [], addons: [], addonIds: [] })).toBeNull();
  });

  it("adds an option and an add-on together for a flat service", () => {
    const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 650, variants: [{ id: 5, price: 150 }] };
    expect(estimateTotal({ service: flat, isMaster: false, variantIds: [5], addons: [{ id: 1, price: 100 }], addonIds: [1] })).toBe(900);
  });

  it("returns null when the service has no price of its own", () => {
    const flat = { pricing_type: "flat" as const, master_price: 0, junior_price: 0, price: 0, variants: [{ id: 5, price: 650 }] };
    expect(estimateTotal({ service: flat, isMaster: false, variantIds: [5], addons: [], addonIds: [] })).toBeNull();
  });
});
