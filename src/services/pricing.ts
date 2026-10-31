// Display-only helpers. The server is the only place a booking total is computed.

export type Priceable = {
  pricing_type?: "tiered" | "flat";
  master_price: number;
  junior_price: number;
  price?: number;
  variants?: { id?: number; price: number }[];
};

export const startingPrice = (service: Priceable): number | null => {
  const prices = service.variants?.length
    ? service.variants.map((v) => v.price)
    : service.pricing_type === "flat"
      ? [service.price ?? 0]
      : [service.master_price, service.junior_price];
  const offered = prices.filter((p) => p > 0);
  return offered.length ? Math.min(...offered) : null;
};

export const estimateTotal = (input: {
  service: Priceable;
  isMaster: boolean;
  variantId: number | null;
  addons: { id: number; price: number }[];
  addonIds: number[];
}): number | null => {
  const { service } = input;
  let base: number;

  if (service.variants?.length) {
    const variant = service.variants.find((v) => v.id === input.variantId);
    if (!variant) return null;
    base = variant.price;
  } else if (service.pricing_type === "flat") {
    base = service.price ?? 0;
  } else {
    const own = input.isMaster ? service.master_price : service.junior_price;
    base = own > 0 ? own : service.master_price || service.junior_price;
  }

  if (!(base > 0)) return null;
  const extras = input.addons
    .filter((a) => input.addonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  return base + extras;
};
