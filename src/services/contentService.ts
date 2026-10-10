import { remember } from "../utils/lastSeen";
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
};

export const fetchHomeContent = async () => {
  const res = await fetch(`${API_BASE_URL}/content/home?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch content");
  }

  return remember("home", await res.json());
};

export const fetchTeamContent = async () => {
  const res = await fetch(`${API_BASE_URL}/content/team?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch team content");
  }

  return remember("team", await res.json());
};

export const updateContent = async (key: string, value: string, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/content/home`, {
    method: "PUT",
    headers: getAuthHeaders(token, clerkId),
    body: JSON.stringify({ key, value }),
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
    throw new Error(data?.error || data?.message || "Failed to update content");
  }

  return data;
};

export const updateHomeContent = async (content: HomeCMSContent, token?: string | null, clerkId?: string | null) => {
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
