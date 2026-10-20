// Display-only helpers. The server is the only place a booking total is computed.

export type Priceable = {
  pricing_type?: "tiered" | "flat";
  master_price: number;
  junior_price: number;
  price?: number;
  /** Options: optional extras on top of the service's price */
  variants?: { id?: number; price: number }[];
};

/** The service's own lowest price (options are extras, so they don't change it) */
export const startingPrice = (service: Priceable): number | null => {
  const prices = service.pricing_type === "flat" ? [service.price ?? 0] : [service.master_price, service.junior_price];
  const offered = prices.filter((p) => p > 0);
  return offered.length ? Math.min(...offered) : null;
};

/** The service's price with the artist, plus the options and add-ons picked */
export const estimateTotal = (input: {
  service: Priceable;
  isMaster: boolean;
  variantIds: number[];
  addons: { id: number; price: number }[];
  addonIds: number[];
}): number | null => {
  const { service } = input;
  const base = service.pricing_type === "flat" ? (service.price ?? 0) : input.isMaster ? service.master_price : service.junior_price;

  if (!(base > 0)) return null;
  const options = (service.variants ?? [])
    .filter((v) => v.id !== undefined && input.variantIds.includes(v.id))
    .reduce((sum, v) => sum + v.price, 0);
  const extras = input.addons
    .filter((a) => input.addonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  return base + options + extras;
};
