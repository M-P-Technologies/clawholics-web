export interface DirectoryUser {
  id: string;
  clerk_id?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role?: string;
  name?: string;
  fullName?: string;
  user_id?: number;
  visit_count?: number;
  last_visit?: string | null;
  is_recurring?: boolean;
  altPhone?: string;
  preferredContactMethod?: string;
  facebookHandle?: string;
  instagramHandle?: string;
}

export interface DirectoryUserPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role?: string;
}

import { API_BASE_URL } from "../apiConfig";

type RawDirectoryUser = Partial<{
  id: string | number;
  _id: string | number;
  userId: string | number;
  user_id: string | number;
  clerkId: string | number;
  clerk_id: string | number;

  firstName: string;
  first_name: string;
  lastName: string;
  last_name: string;
  name: string;
  fullName: string;
  full_name: string;

  phoneNumber: string;
  phone_number: string;
  phone: string;
  contactNumber: string;
  contact_number: string;
  mobile: string;

  email: string;
  emailAddress: string;
  email_address: string;

  role: string;
  userRole: string;
  user_role: string;
  type: string;
  userType: string;
  user_type: string;
  accountType: string;
  account_type: string;

  visit_count: number | string;
  visitCount: number | string;
  last_visit: string | null;
  lastVisit: string | null;
  is_recurring: boolean | number | string;
  isRecurring: boolean | number | string;

  altPhone: string | null;
  preferredContactMethod: string | null;
  facebookHandle: string | null;
  instagramHandle: string | null;
}>;

function buildHeaders(
  token?: string | null,
  hasBody = false,
  clerkId?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-clawholics-origin": "frontend"
  };

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (clerkId) {
    headers["clerk_id"] = clerkId;
  }

  return headers;
}

async function getErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const error = await response.json().catch(() => null);

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (error && typeof error === "object" && "error" in error) {
     return String(error.error);
  }

  if (typeof error === "string") {
    return error;
  }

  return fallbackMessage;
}

function getString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normalizeDirectoryRole(role: unknown): string {
  const roleText = getString(role).trim();

  if (!roleText) {
    return "";
  }

  const normalizedRole = roleText.toLowerCase();

  if (normalizedRole === "customer" || normalizedRole === "client") {
    return "Client";
  }

  return roleText;
}

function unwrapDirectoryUsers(data: unknown): RawDirectoryUser[] {
  if (Array.isArray(data)) {
    return data as RawDirectoryUser[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;

  const arrayKeys = [
    "users",
    "clients",
    "directory",
    "profiles",
    "items",
    "results",
    "rows",
    "data",
  ];

  for (const key of arrayKeys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as RawDirectoryUser[];
    }
  }

  return [];
}

function toPositiveInt(value: unknown): number | undefined {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isInteger(n) && n > 0
    ? n
    : undefined;
}

function toCount(value: unknown): number | undefined {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(n) && n >= 0
    ? n
    : undefined;
}

function toFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizeDirectoryUser(user: RawDirectoryUser): DirectoryUser {
  const rawFullName = getString(
    user.fullName ?? user.full_name ?? user.name
  ).trim();

  const nameParts = rawFullName.split(/\s+/).filter(Boolean);

  const firstName = getString(
    user.firstName ?? user.first_name ?? nameParts[0] ?? ""
  ).trim();

  const lastName = getString(
    user.lastName ?? user.last_name ?? nameParts.slice(1).join(" ")
  ).trim();

  const computedFullName =
    `${firstName} ${lastName}`.replace(/\s+/g, " ").trim() || rawFullName;

  const name = getString(user.name ?? rawFullName ?? computedFullName).trim();

  const phoneNumber = getString(
    user.phoneNumber ??
      user.phone_number ??
      user.phone ??
      user.contactNumber ??
      user.contact_number ??
      user.mobile
  ).trim();

  const email = getString(
    user.email ?? user.emailAddress ?? user.email_address
  ).trim();

  const role = normalizeDirectoryRole(
    user.role ??
      user.userRole ??
      user.user_role ??
      user.type ??
      user.userType ??
      user.user_type ??
      user.accountType ??
      user.account_type
  );

  const rawId =
    user.clerk_id ??
    user.clerkId ??
    user.id ??
    user._id ??
    user.userId ??
    user.user_id;

  const fallbackId = [email, phoneNumber, computedFullName]
    .filter(Boolean)
    .join("-");

  return {
    id: getString(rawId).trim() || fallbackId,
    clerk_id: getString(user.clerk_id ?? user.clerkId).trim() || undefined,
    firstName,
    lastName,
    phoneNumber,
    email,
    role,
    name: name || computedFullName,
    fullName: computedFullName || name,
    // users.id: the directory sends it as `id` (its Clerk id is the tile's id)
    user_id: toPositiveInt(user.user_id ?? user.userId ?? user.id),
    visit_count: toCount(user.visit_count ?? user.visitCount),
    last_visit: getString(user.last_visit ?? user.lastVisit).trim() || null,
    is_recurring: toFlag(user.is_recurring ?? user.isRecurring),
    altPhone: getString(user.altPhone).trim() || undefined,
    preferredContactMethod: getString(user.preferredContactMethod).trim() || undefined,
    facebookHandle: getString(user.facebookHandle).trim() || undefined,
    instagramHandle: getString(user.instagramHandle).trim() || undefined,
  };
}

export async function fetchDirectoryUsers(
  token?: string | null,
  clerkId?: string | null
): Promise<DirectoryUser[]> {
  const response = await fetch(`${API_BASE_URL}/directory?t=${Date.now()}`, {
    cache: "no-store",
    headers: buildHeaders(token, false, clerkId),
  });

  if (!response.ok) {
    if (response.status === 403) {
       window.location.href = "/";
       throw new Error("Forbidden: Admin access required.");
    }
    throw new Error(
      await getErrorMessage(response, "Failed to fetch users.")
    );
  }

  const data = await response.json();
  return unwrapDirectoryUsers(data).map(normalizeDirectoryUser);
}
export async function updateDirectoryUser(
  id: string,
  payload: DirectoryUserPayload,
  token?: string | null,
  clerkId?: string | null
): Promise<DirectoryUser> {
  const response = await fetch(`${API_BASE_URL}/directory/${id}`, {
    method: "PUT",
    headers: buildHeaders(token, true, clerkId),
    body: JSON.stringify({
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      email: payload.email,
      role: payload.role,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    if (response.status === 403) {
      window.location.href = "/";
    }
    throw new Error(data.error || data.message || "Failed to update directory user.");
  }

  return data;
}

export async function deleteDirectoryUser(
  id: string, 
  token?: string | null,
  clerkId?: string | null
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/directory/${id}`, {
    method: "DELETE",
    headers: buildHeaders(token, false, clerkId)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    if (response.status === 403) {
      window.location.href = "/";
    }
    throw new Error(
      data.error || data.message || "Failed to delete directory user."
    );
  }
}

// The directory cards' photos, join dates and last sign-ins from Clerk, by Clerk id (admin only)
export async function fetchDirectoryProfiles(
  token?: string | null,
  clerkId?: string | null
): Promise<{ profiles: Record<string, { imageUrl: string | null; joinedAt: string | null; lastSignInAt: string | null }> }> {
  const response = await fetch(`${API_BASE_URL}/directory/profiles`, {
    cache: "no-store",
    headers: buildHeaders(token, false, clerkId),
  });
  if (!response.ok) throw new Error("Failed to fetch the directory profiles.");
  return response.json();
}

/** The admin accounts, for the Admin Directory */
export async function fetchAdmins(token: string | null, clerkId?: string | null): Promise<DirectoryUser[]> {
  if (!token) throw new Error("Failed to get authentication token");
  const response = await fetch(`${API_BASE_URL}/users/admins`, {
    headers: { Authorization: `Bearer ${token}`, clerk_id: clerkId || "", "x-clawholics-origin": "frontend" },
  });
  if (!response.ok) throw new Error("Failed to fetch admins");
  return response.json();
}

/** Makes the account with this email an admin. Resolves with the server's error, if it refused. */
export async function promoteAdmin(email: string, token: string | null, clerkId?: string | null): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/users/promote-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      clerk_id: clerkId || "",
      "x-clawholics-origin": "frontend",
    },
    body: JSON.stringify({ targetEmail: email }),
  });
  const result = await response.json();
  return { ok: response.ok && !result.error, error: result.error };
}
