import { API_BASE_URL } from "../apiConfig";
import type { DashboardRange } from "../lib/dashboardPeriods";
import type { AttentionResponse, AttentionTab, DashboardResponse, Utilization } from "./dashboardTypes";

export const fetchDashboard = async (
  range: DashboardRange,
  token?: string | null,
  clerkId?: string | null,
): Promise<DashboardResponse> => {
  const load = () =>
    fetch(`${API_BASE_URL}/dashboard?range=${range}`, {
      headers: {
        "x-clawholics-origin": "frontend",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(clerkId ? { clerk_id: clerkId } : {}),
      },
    });
  let res = await load();
  // 503: the server gave up waiting for the database and has opened new connections by now,
  // so asking once more usually works (as the Schedule does)
  if (res.status === 503) res = await load();
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

// The queue of what to act on, for one of its tabs (admin only)
export const fetchAttention = async (tab: AttentionTab, token?: string | null, clerkId?: string | null): Promise<AttentionResponse> => {
  const res = await fetch(`${API_BASE_URL}/attention?tab=${tab}`, {
    headers: {
      "x-clawholics-origin": "frontend",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clerkId ? { clerk_id: clerkId } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to load what needs attention (${res.status})`);
  return res.json();
};
