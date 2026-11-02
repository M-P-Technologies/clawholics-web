import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { DEFAULT_POLICY, hoursLabel, type SalonPolicy } from "../lib/policy";

// The salon's policy numbers (Admin > Settings > Policies): the change window and the late fees.
// The defaults until they load, or if they can't; the server enforces whatever is saved.
export function usePolicy(): SalonPolicy & { changeWindowLabel: string } {
  const policy = useQuery(publicQueries.policySettings()).data ?? DEFAULT_POLICY;
  return { ...policy, changeWindowLabel: hoursLabel(policy.change_window_hours) };
}
