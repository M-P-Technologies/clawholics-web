import { remember } from "../utils/lastSeen";
import { API_BASE_URL } from "../apiConfig";

export type ServiceAddon = {
  id: number;
  category_id: number;
  name: string;
  price: number;
  display_order: number;
};

export type ServiceCategory = {
  id: number;
  name: string;
  display_order: number;
  addons: ServiceAddon[];
};

export type Auth = { token: string | null; clerkId?: string | null };

export class ApiError extends Error {
  status: number;
  field?: string;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, field?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
    this.details = details;
  }
}

const headers = (auth?: Auth): Record<string, string> => {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "x-clawholics-origin": "frontend",
  };
  if (auth?.token) h["Authorization"] = `Bearer ${auth.token}`;
  if (auth?.clerkId) h["clerk_id"] = auth.clerkId;
  return h;
};

export const call = async <T>(path: string, init: RequestInit, auth?: Auth): Promise<T> => {
  const h = headers(auth);
  // A FormData body needs the browser's own multipart Content-Type (with its boundary)
  if (init.body instanceof FormData) delete h["Content-Type"];
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: h });
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    const message =
      typeof data.message === "string" && data.message
        ? data.message
        : typeof data.error === "string" && data.error
          ? data.error
          : "Request failed";
    throw new ApiError(message, res.status, data.field, data);
  }
  return data as T;
};

// The backend serves categories at /categories and names the order field
// `position`. Add-ons are not in the backend yet, so categories come back
// without them; normalise to the shape the screens use.
const CATEGORIES = "/categories";

type RawCategory = Omit<ServiceCategory, "display_order" | "addons"> & {
  display_order?: number;
  position?: number;
  addons?: ServiceAddon[];
};

const normalizeCategory = (raw: RawCategory): ServiceCategory => ({
  ...raw,
  display_order: raw.display_order ?? raw.position ?? 0,
  addons: Array.isArray(raw.addons) ? raw.addons : [],
});

export const fetchCategories = async () =>
  remember(
    "categories",
    (await call<RawCategory[]>(`${CATEGORIES}?t=${Date.now()}`, { method: "GET" })).map(normalizeCategory),
  );

export const createCategory = async (name: string, auth: Auth) =>
  normalizeCategory(await call<RawCategory>(CATEGORIES, { method: "POST", body: JSON.stringify({ name }) }, auth));

export const renameCategory = async (id: number, name: string, auth: Auth) =>
  normalizeCategory(await call<RawCategory>(`${CATEGORIES}/${id}`, { method: "PUT", body: JSON.stringify({ name }) }, auth));

export const reorderCategories = (ids: number[], auth: Auth) =>
  call<unknown>(`${CATEGORIES}/reorder`, { method: "PUT", body: JSON.stringify({ ids }) }, auth);

// The backend refuses to delete a category that still has services (409) unless
// the services are moved with `reassignTo`.
export const deleteCategory = (id: number, auth: Auth, reassignTo?: number) =>
  call<unknown>(
    `${CATEGORIES}/${id}${reassignTo === undefined ? "" : `?reassign_to=${reassignTo}`}`,
    { method: "DELETE" },
    auth,
  );

export const createAddon = (categoryId: number, name: string, price: number, auth: Auth) =>
  call<ServiceAddon>(`${CATEGORIES}/${categoryId}/addons`, { method: "POST", body: JSON.stringify({ name, price }) }, auth);

export const updateAddon = (id: number, name: string, price: number, auth: Auth) =>
  call<ServiceAddon>(`${CATEGORIES}/addons/${id}`, { method: "PUT", body: JSON.stringify({ name, price }) }, auth);

export const deleteAddon = (id: number, auth: Auth) =>
  call<void>(`${CATEGORIES}/addons/${id}`, { method: "DELETE" }, auth);
