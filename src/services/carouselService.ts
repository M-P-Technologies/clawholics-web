import { previewed } from "../lib/cmsPreview";
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

export type CarouselItem = {
  id: number;
  image_url: string;
  position: number;
};

const loadCarousel = async (): Promise<CarouselItem[]> => {
  const res = await fetch(`${API_BASE_URL}/carousel?t=${Date.now()}`, {
    headers: { "x-clawholics-origin": "frontend" }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch carousel");
  }

  return remember("carousel", await res.json());
};

export const updateCarousel = async (images: CarouselItem[], token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/carousel`, {
    method: "PUT",
    headers: getAuthHeaders(token, clerkId),
    body: JSON.stringify({ images }),
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
    throw new Error(data?.error || data?.message || "Failed to update carousel");
  }

  return data;
};

// Through the admin editor's live preview (see lib/cmsPreview); a plain fetch everywhere else
export const fetchCarousel = () => previewed("carousel", () => loadCarousel(), "carousel");
