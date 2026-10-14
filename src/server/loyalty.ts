import "server-only";
import { getSql } from "./db";

// The loyalty card: how many stamps earn a reward (site setting loyalty_stamps_required),
// edited in Admin > Settings

export const DEFAULT_LOYALTY_STAMPS = 10;
export const MAX_LOYALTY_STAMPS = 20;

export async function getLoyaltyStampsRequired(): Promise<number> {
  const [row] = await getSql()<{ value: string }[]>`select value from site_settings where key = 'loyalty_stamps_required'`;
  const stamps = Number(row?.value);
  return Number.isInteger(stamps) && stamps >= 1 && stamps <= MAX_LOYALTY_STAMPS ? stamps : DEFAULT_LOYALTY_STAMPS;
}
