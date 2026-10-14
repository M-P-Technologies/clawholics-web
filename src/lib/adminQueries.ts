import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { GetToken } from "./accountQueries";
import { fetchAdminPage, fetchDirectoryProfiles, fetchDirectoryUsers } from "../services/directoryService";
import { fetchWarmLeads } from "../services/dashboardService";
import { fetchMonthlySchedule } from "../services/scheduleService";
import { fetchClient, fetchNextSteps, fetchNotes } from "../services/clientNotesService";
import { fetchScanHistory } from "../services/scanService";
import { fetchNailists, type Nailist } from "../services/nailistService";
import type { DashboardRange } from "./dashboardPeriods";

// The admin screens' data as TanStack Query queries. Screens that show the same data share one
// request and one cached copy: the directory and its Clerk details (Clients & Bookings and the
// Admin Directory), a month of the schedule, a client's page. Coming back to a screen shows the
// cached copy at once and refreshes it behind it.
// Every key starts with ADMIN: QueryProvider drops them all when the signed-in user changes, and
// a change to an appointment refreshes them all (adminDataChanged).
// Don't import services/appointmentService here: it imports ADMIN from this file.

/** The first part of every admin query's key */
export const ADMIN = "admin";

/** The signed-in admin's session, which every admin request is sent with */
export interface AdminSession {
  getToken: GetToken;
  clerkId?: string;
}

export const adminKeys = {
  dashboard: (range: DashboardRange) => [ADMIN, "dashboard", range] as const,
  /** Artist utilization for the week starting on this Monday (YYYY-MM-DD) */
  utilization: (monday: string) => [ADMIN, "utilization", monday] as const,
  directoryUsers: () => [ADMIN, "directory", "users"] as const,
  directoryProfiles: () => [ADMIN, "directory", "profiles"] as const,
  /** A page of the Admin Directory */
  adminPage: (page: number, pageSize: number) => [ADMIN, "directory", "admins", page, pageSize] as const,
  leads: () => [ADMIN, "leads"] as const,
  /** A month of the schedule, YYYY-MM */
  scheduleMonth: (month: string) => [ADMIN, "schedule", month] as const,
  client: (clientId: number) => [ADMIN, "clients", clientId] as const,
  clientNotes: (clientId: number) => [ADMIN, "clients", clientId, "notes"] as const,
  clientNextSteps: (clientId: number) => [ADMIN, "clients", clientId, "nextSteps"] as const,
  scanHistory: () => [ADMIN, "scanHistory"] as const,
  nailists: () => [ADMIN, "nailists"] as const,
  /** An appointment's payment proofs */
  proofs: (appointmentId: number) => [ADMIN, "proofs", appointmentId] as const,
};

export const adminQueries = {
  /** Every directory row (also syncs the directory with Clerk on the server) */
  directoryUsers: ({ getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.directoryUsers(), queryFn: async () => fetchDirectoryUsers(await getToken(), clerkId) }),
  /** Each Clerk user's photo, join date and last sign-in, by Clerk id */
  directoryProfiles: ({ getToken, clerkId }: AdminSession) =>
    queryOptions({
      queryKey: adminKeys.directoryProfiles(),
      queryFn: async () => (await fetchDirectoryProfiles(await getToken(), clerkId)).profiles,
    }),
  adminPage: (page: number, pageSize: number, { getToken, clerkId }: AdminSession) =>
    queryOptions({
      queryKey: adminKeys.adminPage(page, pageSize),
      queryFn: async () => fetchAdminPage(page, pageSize, await getToken(), clerkId),
    }),
  /** The warm leads' Clerk ids */
  leads: ({ getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.leads(), queryFn: async () => (await fetchWarmLeads(await getToken(), clerkId)).clerkIds }),
  scheduleMonth: (month: string, { getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.scheduleMonth(month), queryFn: async () => fetchMonthlySchedule(month, await getToken(), clerkId) }),
  client: (clientId: number, { getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.client(clientId), queryFn: async () => fetchClient(clientId, { token: await getToken(), clerkId }) }),
  clientNotes: (clientId: number, { getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.clientNotes(clientId), queryFn: async () => fetchNotes(clientId, { token: await getToken(), clerkId }) }),
  clientNextSteps: (clientId: number, { getToken, clerkId }: AdminSession) =>
    queryOptions({
      queryKey: adminKeys.clientNextSteps(clientId),
      queryFn: async () => fetchNextSteps(clientId, { token: await getToken(), clerkId }),
    }),
  /** Every artist (the Artists editor, the appointment list's artist filter) */
  nailists: () => queryOptions({ queryKey: adminKeys.nailists(), queryFn: (): Promise<Nailist[]> => fetchNailists() }),
  scanHistory: ({ getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.scanHistory(), queryFn: async () => fetchScanHistory(await getToken(), clerkId) }),
};

/**
 * After an admin changes an appointment, a client or an account: every admin screen's data may
 * show it (the lists, the schedule, the dashboard, a client's page), so all of it is marked stale
 * and what's on screen is fetched again.
 */
export function adminDataChanged(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: [ADMIN] });
}
