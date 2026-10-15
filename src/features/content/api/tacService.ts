export type Tac = {
  id: number;
  section: string;
  content: string;
  display_order: number;
};

import { previewed } from "../../cms/lib/cmsPreview";
import { API_BASE_URL } from "../../../lib/apiConfig";

const getHeaders = (token?: string | null, clerkId?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-clawholics-origin": "frontend"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (clerkId) headers["clerk_id"] = clerkId;
  return headers;
};

const loadTacs = async (): Promise<Tac[]> => {
  const res = await fetch(`${API_BASE_URL}/tacs?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch TACs");
  }

  return res.json();
};

export const createTac = async (
  section: string,
  content: string,
  displayOrder: number,
  token?: string | null,
  clerkId?: string | null
): Promise<Tac> => {
  const res = await fetch(`${API_BASE_URL}/tacs`, {
    method: "POST",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ section, content, display_order: displayOrder }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || "Failed to create TAC");
  }

  return data;
};

export const updateTac = async (
  id: number,
  section: string,
  content: string,
  displayOrder: number,
  token?: string | null,
  clerkId?: string | null
): Promise<Tac> => {
  const res = await fetch(`${API_BASE_URL}/tacs/${id}`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ section, content, display_order: displayOrder }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || "Failed to update TAC");
  }

  return data;
};

export const deleteTac = async (id: number, token?: string | null, clerkId?: string | null): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/tacs/${id}`, {
    method: "DELETE",
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    const errorText = await res.text();
    throw new Error(errorText || "Failed to delete TAC");
  }
};

// Through the admin editor's live preview (see lib/cmsPreview); a plain fetch everywhere else
export const fetchTacs = () => previewed("tacs", () => loadTacs());
