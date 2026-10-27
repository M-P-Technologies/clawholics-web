import { previewed } from "../lib/cmsPreview";
export type Nailist = {
  id: number;
  name: string;
  position: string;
  specialty: string;
  bio: string;
  image: string;
  service_ids?: number[];
  offered_services?: string[];
};

export type NailistGalleryImage = {
  id: number;
  nailist_id: number;
  image_url: string;
  position: number;
};

export type NailistDayOffs = {
  regularDays: number[];
  customDates: string[];
};

export type NailistTimeSlots = string[];

import { API_BASE_URL } from "../apiConfig";

const getHeaders = (token?: string | null, clerkId?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-clawholics-origin": "frontend"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (clerkId) headers["clerk_id"] = clerkId;
  return headers;
};

const loadNailists = async (): Promise<Nailist[]> => {
  const res = await fetch(`${API_BASE_URL}/nailists?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });
  // A failed answer is an error object, not a list: refuse it, so the screens show their load error
  const data = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(data)) throw new Error("Failed to fetch artists");
  return data;
};
export const fetchNailistServices = async (
  nailistId: number,
): Promise<number[]> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${nailistId}/services?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch nail artist services");
  }

  return data;
};

export const updateNailistServices = async (
  nailistId: number,
  serviceIds: number[],
  token?: string | null,
  clerkId?: string | null
): Promise<number[]> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${nailistId}/services`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ serviceIds }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || data.message || "Failed to update nail artist services");
  }

  return data;
};

export const fetchNailistTimeSlots = async (
  nailistId: number,
): Promise<NailistTimeSlots> => {
  const res = await fetch(
    `${API_BASE_URL}/nailists/${nailistId}/time-slots?t=${Date.now()}`,
    {
      cache: "no-store",
      headers: { "x-clawholics-origin": "frontend" }
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch time slots");
  }

  return data;
};

export const updateNailistTimeSlots = async (
  nailistId: number,
  timeSlots: NailistTimeSlots,
  token?: string | null,
  clerkId?: string | null
): Promise<NailistTimeSlots> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${nailistId}/time-slots`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ timeSlots }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || data.message || "Failed to update time slots");
  }

  return data;
};

export const createNailist = async (
  name: string,
  position: string,
  specialty: string,
  bio: string,
  image: string,
  token?: string | null,
  clerkId?: string | null
): Promise<Nailist> => {
  const res = await fetch(`${API_BASE_URL}/nailists`, {
    method: "POST",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ name, position, specialty, bio, image }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || data.message || "Failed to create nail artist");
  }

  return data;
};

export const updateNailist = async (
  id: number,
  name: string,
  position: string,
  specialty: string,
  bio: string,
  image: string,
  token?: string | null,
  clerkId?: string | null
): Promise<Nailist> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${id}`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ name, position, specialty, bio, image }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || data.message || "Failed to update nail artist");
  }

  return data;
};

export const deleteNailist = async (id: number, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/nailists/${id}`, {
    method: "DELETE",
    headers: getHeaders(token, clerkId)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || data.message || "Failed to delete nail artist");
  }

  return data;
};
export const fetchNailistDayOffs = async (
  id: number,
): Promise<NailistDayOffs> => {
  const res = await fetch(
    `${API_BASE_URL}/nailists/${id}/day-offs?t=${Date.now()}`,
    {
      cache: "no-store",
      headers: { "x-clawholics-origin": "frontend" }
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Failed to fetch day offs");
  }

  return data;
};

export const updateNailistDayOffs = async (
  id: number,
  dayOffs: NailistDayOffs,
  token?: string | null,
  clerkId?: string | null
): Promise<NailistDayOffs> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${id}/day-offs`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify(dayOffs),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || data.message || "Failed to update day offs");
  }

  return data;
};

/** One artist, or null when there is no such artist. */
const loadNailistById = async (id: number): Promise<Nailist | null> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${id}?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch artist");
  return res.json();
};

const loadNailistGallery = async (id: number): Promise<NailistGalleryImage[]> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${id}/gallery?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" },
  });
  if (!res.ok) throw new Error("Failed to fetch artist gallery");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const addNailistGalleryImage = async (
  nailistId: number,
  imageUrl: string,
  token?: string | null,
  clerkId?: string | null,
): Promise<{ id: number }> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${nailistId}/gallery`, {
    method: "POST",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ image_url: imageUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Failed to add artist gallery image");
  return data;
};

export const deleteNailistGalleryImage = async (id: number, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/nailist-gallery/${id}`, {
    method: "DELETE",
    headers: getHeaders(token, clerkId),
  });
  if (!res.ok) throw new Error("Failed to delete artist gallery image");
};

// Through the admin editor's live preview (see lib/cmsPreview); a plain fetch everywhere else
export const fetchNailists = () => previewed("nailists", () => loadNailists());
export const fetchNailistById = (id: number) => previewed(`nailist:${id}`, () => loadNailistById(id));
export const fetchNailistGallery = (id: number) => previewed(`nailistGallery:${id}`, () => loadNailistGallery(id));

export type NailistVisitPhoto = { url: string; appointment_id: number; /** The service of that visit */ artist: string | null };

// The nail photos added to visits this artist completed (admin only)
export const fetchNailistVisitPhotos = async (id: number, token?: string | null, clerkId?: string | null): Promise<NailistVisitPhoto[]> => {
  const res = await fetch(`${API_BASE_URL}/nailists/${id}/visit-photos`, {
    headers: {
      "x-clawholics-origin": "frontend",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clerkId ? { clerk_id: clerkId } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to load the visit photos (${res.status})`);
  return res.json();
};
