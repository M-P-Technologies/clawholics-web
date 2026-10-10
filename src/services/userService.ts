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

export interface UserProfile {
  id: number;
  clerk_id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  stamps: number;
  onboarded?: boolean;
  member_since_month?: string;
  member_since_year?: string;
}

// Carries the HTTP status so callers can tell "no profile yet" (404) apart
// from a real failure (401, 500, backend down).
export class ProfileError extends Error {
  status: number;
  constructor(status: number) {
    super("Failed to fetch user profile");
    this.status = status;
  }
}

export const isMissingProfile = (err: unknown): boolean =>
  err instanceof ProfileError && err.status === 404;

export const fetchProfile = async (clerkId: string, token?: string | null): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE_URL}/users/profile?clerk_id=${clerkId}&t=${Date.now()}`, {
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new ProfileError(res.status);
  }

  return res.json();
};

export const updateProfile = async (
  clerkId: string,
  profileData: Partial<UserProfile>,
  token?: string | null
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/users/profile?clerk_id=${clerkId}`, {
    method: "PUT",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to update profile");
  }
};

export const fetchUserAppointments = async (clerkId: string, token?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/users/appointments?clerk_id=${clerkId}&t=${Date.now()}`, {
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch user appointments");
  }

  return res.json();
};
export const redeemUserReward = async (clerkId: string, token?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/users/redeem`, {
    method: "POST",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ clerk_id: clerkId }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to redeem reward");
  }
  return json;
};

// This is a bridge to the booking service for the profile page
export const cancelAppointment = async (appointmentId: number, token?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/booking/${appointmentId}/refund`, {
    method: "POST",
    headers: getHeaders(token),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to cancel appointment");
  }
  return json;
};
