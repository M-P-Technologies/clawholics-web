import { previewed } from "../lib/cmsPreview";
import { API_BASE_URL } from "../apiConfig";

export type ServiceGalleryImage = {
  id: number;
  service_id: number;
  image_url: string;
  position: number;
};

type ServiceVariant = {
  id: number;
  service_id: number;
  name: string;
  price: number;
  display_order: number;
};

export type NailService = {
  id: number;
  name: string;
  category: string;
  category_id: number | null;
  description: string;
  pricing_type: "tiered" | "flat";
  master_price: number;
  junior_price: number;
  price: number;
  duration: string;
  image: string;
  variants: ServiceVariant[];
  gallery?: ServiceGalleryImage[];
};

type ServicePayload = {
  name: string;
  category_id: number;
  description: string;
  pricing_type: "tiered" | "flat";
  master_price: number;
  junior_price: number;
  price: number;
  duration: string;
  image: string;
  variants: { name: string; price: number }[];
};

const getHeaders = (token?: string | null, clerkId?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-clawholics-origin": "frontend"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (clerkId) headers["clerk_id"] = clerkId;
  return headers;
};

const loadServices = async (): Promise<NailService[]> => {
  const res = await fetch(`${API_BASE_URL}/services?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch services");
  }

  return await res.json();
};

const loadServiceById = async (id: number): Promise<NailService> => {
  const res = await fetch(`${API_BASE_URL}/services/${id}?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error("Service not found");
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch service");
  }

  const data = await res.json();
  return data?.data ?? data;
};

const readError = (data: Record<string, unknown> | object, fallback: string): string => {
  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return fallback;
};

export const createService = async (
  payload: ServicePayload,
  token?: string | null,
  clerkId?: string | null
): Promise<NailService> => {
  const res = await fetch(`${API_BASE_URL}/services`, {
    method: "POST",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(readError(data, "Failed to create service"));
  }

  return data;
};

export const updateService = async (
  id: number,
  payload: ServicePayload,
  token?: string | null,
  clerkId?: string | null
): Promise<NailService> => {
  const res = await fetch(`${API_BASE_URL}/services/${id}`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(readError(data, "Failed to update service"));
  }

  return data;
};

export const deleteService = async (id: number, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/services/${id}`, {
    method: "DELETE",
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to delete service");
  }
};
const loadServiceGallery = async (
  serviceId: number,
): Promise<ServiceGalleryImage[]> => {
  const res = await fetch(`${API_BASE_URL}/api/services/${serviceId}/gallery`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch service gallery");
  }

  return res.json();
};

export const addServiceGalleryImage = async (
  serviceId: number,
  image_url: string,
  position: number,
  token?: string | null,
  clerkId?: string | null
): Promise<{ id: number }> => {
  const res = await fetch(`${API_BASE_URL}/api/services/${serviceId}/gallery`, {
    method: "POST",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ image_url, position }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || "Failed to add service gallery image");
  }

  return data;
};

export const deleteServiceGalleryImage = async (id: number, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/api/gallery/${id}`, {
    method: "DELETE",
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to delete service gallery image");
  }
};

// Through the admin editor's live preview (see lib/cmsPreview); a plain fetch everywhere else
export const fetchServices = () => previewed("services", () => loadServices());
export const fetchServiceById = (id: number) => previewed(`service:${id}`, () => loadServiceById(id));
export const fetchServiceGallery = (serviceId: number) => previewed(`serviceGallery:${serviceId}`, () => loadServiceGallery(serviceId));
