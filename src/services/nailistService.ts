import { remember } from "../utils/lastSeen";
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

export const fetchNailists = async () => {
  const res = await fetch(`${API_BASE_URL}/nailists?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });
  return remember("nailists", await res.json());
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
    throw new Error(data?.message || "Failed to fetch day offs");
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
