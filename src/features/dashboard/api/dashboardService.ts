import { API_BASE_URL } from "../../../lib/apiConfig";
import type { DashboardRange } from "../lib/dashboardPeriods";
import type { DashboardResponse, Utilization } from "../types";

export const fetchDashboard = async (
  range: DashboardRange,
  token?: string | null,
  clerkId?: string | null,
): Promise<DashboardResponse> => {
  const res = await fetch(`${API_BASE_URL}/dashboard?range=${range}`, {
    headers: {
      "x-clawholics-origin": "frontend",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clerkId ? { clerk_id: clerkId } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to load the dashboard (${res.status})`);
  return res.json();
};

// The Clerk ids of the warm leads the dashboard counts (admin only)
export const fetchWarmLeads = async (token?: string | null, clerkId?: string | null): Promise<{ clerkIds: string[] }> => {
  const res = await fetch(`${API_BASE_URL}/leads`, {
    headers: {
      "x-clawholics-origin": "frontend",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clerkId ? { clerk_id: clerkId } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to load the warm leads (${res.status})`);
  return res.json();
};

// Artist utilization for the Monday-to-Sunday week holding `date` (admin only)
export const fetchUtilization = async (date: string, token?: string | null, clerkId?: string | null): Promise<Utilization> => {
  const res = await fetch(`${API_BASE_URL}/utilization?week=${date}`, {
    headers: {
      "x-clawholics-origin": "frontend",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clerkId ? { clerk_id: clerkId } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to load artist utilization (${res.status})`);
  return res.json();
};
