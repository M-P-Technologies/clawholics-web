import { previewed } from "../lib/cmsPreview";
import { API_BASE_URL } from "../apiConfig";

const getAuthHeaders = (token?: string | null, clerkId?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-clawholics-origin": "frontend"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (clerkId) {
    headers.clerk_id = clerkId;
  }

  return headers;
};

export type HomeCMSContent = {
  home_title: string;
  home_services_subtitle: string;
  home_about_subtitle: string;
  home_about_image: string;
  home_hero_image: string;
};

const loadHomeContent = async () => {
  const res = await fetch(`${API_BASE_URL}/content/home?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch content");
  }

  return await res.json();
};

const loadTeamContent = async () => {
  const res = await fetch(`${API_BASE_URL}/content/team?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch team content");
  }

  return await res.json();
};

const loadLegalContent = async (): Promise<Record<string, string>> => {
  const res = await fetch(`${API_BASE_URL}/content/legal?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" },
  });
  if (!res.ok) throw new Error("Failed to fetch the legal pages");
  return res.json();
};

/** The legal pages' saved text (legal_* keys); empty until something was saved */
export const fetchLegalContent = () => previewed("legal", () => loadLegalContent(), "legal");

/** Saves the legal pages' text (legal_* keys) */
export const updateLegalContent = async (values: Record<string, string>, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/content/legal`, {
    method: "PUT",
    headers: getAuthHeaders(token, clerkId),
    body: JSON.stringify({ updates: Object.entries(values).map(([key, value]) => ({ key, value })) }),
  });
  const data: { message?: string; error?: string } | null = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data?.error || data?.message || "Failed to update the legal pages");
  }
  return data;
};

/** Saves the Artists page's words (team_* keys) in one request */
export const updateTeamContent = async (values: Record<string, string>, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/content/team`, {
    method: "PUT",
    headers: getAuthHeaders(token, clerkId),
    body: JSON.stringify({ updates: Object.entries(values).map(([key, value]) => ({ key, value })) }),
  });
  const data: { message?: string; error?: string } | null = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data?.error || data?.message || "Failed to update the artists page");
  }
  return data;
};

/** Saves home content keys (the homepage's, or the contact details) in one request */
export const updateHomeContent = async (content: Record<string, string>, token?: string | null, clerkId?: string | null) => {
  const updates = Object.entries(content).map(([key, value]) => ({
    key,
    value,
  }));

  const res = await fetch(`${API_BASE_URL}/content/home`, {
    method: "PUT",
    headers: getAuthHeaders(token, clerkId),
    body: JSON.stringify({ updates }),
  });

  let data: { message?: string; error?: string } | null = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.error) {
    if (res.status === 403) {
      window.location.href = "/";
    }
    throw new Error(data?.error || data?.message || "Failed to update home content");
  }

  return data;
};

// Through the admin editor's live preview (see lib/cmsPreview); a plain fetch everywhere else
export const fetchHomeContent = () => previewed("home", () => loadHomeContent(), "home");
export const fetchTeamContent = () => previewed("team", () => loadTeamContent(), "team");
