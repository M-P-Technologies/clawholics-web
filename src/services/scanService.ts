import { API_BASE_URL } from "../apiConfig";

/** One loyalty scan in the Recent scans list */
export type ScanRecord = {
  id: string;
  userId: string;
  clientName: string;
  action: "stamp" | "redeem" | "invalid";
  time: string;
};

/** The client a loyalty QR code belongs to */
export type ScannedClient = {
  id: string;
  name: string;
  stamps: number;
};

const headers = (token: string | null, clerkId?: string | null, json = false): Record<string, string> => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  Authorization: `Bearer ${token}`,
  clerk_id: clerkId || "",
  "x-clawholics-origin": "frontend",
});

/** A page of the scans, newest first, and how many there are in all */
export type ScanPage = { rows: ScanRecord[]; total: number; page: number; pageSize: number };

/** One page of the scans, or null when they can't be loaded */
export async function fetchScanHistory(page: number, pageSize: number, token: string | null, clerkId?: string | null): Promise<ScanPage | null> {
  const response = await fetch(`${API_BASE_URL}/users/scan-history?page=${page}&pageSize=${pageSize}`, { headers: headers(token, clerkId) });
  return response.ok ? response.json() : null;
}

/** The client with this id, or null when there's none */
export async function fetchScannedClient(userId: string, token: string | null, clerkId?: string | null): Promise<ScannedClient | null> {
  const response = await fetch(`${API_BASE_URL}/users/scan/${userId}`, { method: "GET", headers: headers(token, clerkId) });
  return response.ok ? response.json() : null;
}

/** Adds a stamp to the client's card, or redeems the full card */
export async function recordScanAction(userId: string, action: "stamp" | "redeem", token: string | null, clerkId?: string | null) {
  const res = await fetch(`${API_BASE_URL}/users/scan/${userId}/${action}`, { method: "POST", headers: headers(token, clerkId, true) });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || data?.error || "The scan couldn't be saved.");
  }
}
