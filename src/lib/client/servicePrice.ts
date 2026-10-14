import { peso } from "../dashboardFormat";
import { startingPrice, type Priceable } from "../../services/pricing";

// How the client app writes a service's price. Display only: the server computes totals.

/** "₱800", "₱600 – ₱900" (junior to master), "from ₱500" (variants), or "" when no price is set */
export function priceLabel(s: Priceable): string {
  if (s.variants?.length) {
    const from = startingPrice(s);
    return from === null ? "" : `from ${peso(from)}`;
  }
  if (s.pricing_type === "flat") return (s.price ?? 0) > 0 ? peso(s.price ?? 0) : "";
  const offered = [s.junior_price, s.master_price].filter((p) => p > 0);
  if (!offered.length) return "";
  const low = Math.min(...offered);
  const high = Math.max(...offered);
  return low === high ? peso(low) : `${peso(low)} – ${peso(high)}`;
}

/** For tight places (cards, rows): a range becomes "from ₱…" */
export function shortPriceLabel(s: Priceable): string {
  const full = priceLabel(s);
  if (!full.includes("–")) return full;
  const from = startingPrice(s);
  return from === null ? "" : `from ${peso(from)}`;
}

/** The service page's "Artists" fact */
export const artistsFact = (s: Priceable): string =>
  s.pricing_type !== "flat" && !s.variants?.length && s.master_price > 0 && s.junior_price > 0 ? "Master & Junior" : "Our team";
