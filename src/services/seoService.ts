import { API_BASE_URL } from "../apiConfig";

const headers = (token?: string | null, clerkId?: string | null) => ({
  "Content-Type": "application/json",
  "x-clawholics-origin": "frontend",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(clerkId ? { clerk_id: clerkId } : {}),
});

/** The saved search and sharing text (seo_* keys); empty until something was saved */
export const fetchSeoContent = async (): Promise<Record<string, string>> => {
  const res = await fetch(`${API_BASE_URL}/content/seo?t=${Date.now()}`, { headers: { "x-clawholics-origin": "frontend" } });
  if (!res.ok) throw new Error("Failed to fetch the search and sharing text");
  return res.json();
};

/** Saves the search and sharing text (seo_* keys) in one request */
export const updateSeoContent = async (values: Record<string, string>, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/content/seo`, {
    method: "PUT",
    headers: headers(token, clerkId),
    body: JSON.stringify({ updates: Object.entries(values).map(([key, value]) => ({ key, value })) }),
  });
  const data: { message?: string; error?: string } | null = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data?.error || data?.message || "Failed to update the search and sharing text");
  }
  return data;
};
