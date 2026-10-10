import { remember } from "../utils/lastSeen";
import { API_BASE_URL } from "../apiConfig";

export type AboutContent = {
  about_description: string;
  about_image: string;
  about_location: string;
  about_location_url: string;
  about_business_hours_Monday: string;
  about_business_hours_Tuesday: string;
  about_business_hours_Wednesday: string;
  about_business_hours_Thursday: string;
  about_business_hours_Friday: string;
  about_business_hours_Saturday: string;
  about_business_hours_Sunday: string;
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

export const fetchAboutContent = async (): Promise<AboutContent> => {
  const res = await fetch(`${API_BASE_URL}/content/about?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch about content");
  }

  return remember("about", await res.json());
};

export const updateAboutContent = async (
  content: AboutContent | Record<string, string>,
  token?: string | null,
  clerkId?: string | null
) => {
  const updates = Object.entries(content).map(([key, value]) => ({
    key,
    value,
  }));

  const res = await fetch(`${API_BASE_URL}/content/about`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ updates }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || "Failed to update about content");
  }

  return data;
};

export const uploadAboutImage = async (
  file: File,
  token?: string | null,
  clerkId?: string | null
): Promise<{ imageUrl: string }> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE_URL}/content/about/upload-image`, {
    method: "POST",
    headers: {
      "x-clawholics-origin": "frontend",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clerkId ? { clerk_id: clerkId } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data.error || "Failed to upload about image");
  }

  return data;
};
