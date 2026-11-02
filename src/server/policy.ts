import "server-only";
import { getSql } from "./db";
import { DEFAULT_POLICY, POLICY_KEYS, readPolicy, type SalonPolicy } from "../lib/policy";

export { DEFAULT_POLICY };

// The salon's policy numbers (site_settings, one key each), edited in Admin > Settings > Policies.
// Anything not saved yet, or saved in a way that doesn't hold together, is the default.
export async function getPolicy(): Promise<SalonPolicy> {
  const rows = await getSql()<{ key: string; value: string }[]>`select key, value from site_settings where key in ${getSql()(POLICY_KEYS)}`;
  return readPolicy(Object.fromEntries(rows.map((row) => [row.key, row.value])));
}

/** The policy for something that must go ahead without it (an email): the defaults when it can't be read */
export async function getPolicyOrDefault(): Promise<SalonPolicy> {
  try {
    return await getPolicy();
  } catch (error) {
    console.error("[policy] could not read the policy, using the defaults:", error);
    return DEFAULT_POLICY;
  }
}
