import { infiniteQueryOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import type { GetToken } from "./accountQueries";
import { fetchAdminPage, fetchDirectoryProfiles, fetchDirectoryUsers } from "../services/directoryService";
import { fetchWarmLeads } from "../services/dashboardService";
import { fetchNailistVisitPhotos } from "../services/nailistService";
import { fetchServiceVisitPhotos, fetchVisitPhotos } from "../services/serviceService";
import { fetchMonthlySchedule } from "../services/scheduleService";
import { fetchClient, fetchNextSteps, fetchNotes } from "../services/clientNotesService";
import { fetchScanHistory } from "../services/scanService";
import { fetchNailists, type Nailist } from "../services/nailistService";
import { fetchAdminNotifications } from "../services/notificationService";
import type { DashboardRange } from "./dashboardPeriods";
import { BOOKING } from "./bookingQueries";

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
  /** The nail photos of a service's completed visits */
  visitPhotos: () => [ADMIN, "visitPhotos"] as const,
  nailistVisitPhotos: (id: number) => [ADMIN, "nailistVisitPhotos", id] as const,
  serviceVisitPhotos: (serviceId: number) => [ADMIN, "serviceVisitPhotos", serviceId] as const,
  /** A month of the schedule, YYYY-MM */
  scheduleMonth: (month: string) => [ADMIN, "schedule", month] as const,
  client: (clientId: number) => [ADMIN, "clients", clientId] as const,
  clientNotes: (clientId: number) => [ADMIN, "clients", clientId, "notes"] as const,
  clientNextSteps: (clientId: number) => [ADMIN, "clients", clientId, "nextSteps"] as const,
  /** Every page of the recent scans */
  scanHistoryAll: () => [ADMIN, "scanHistory"] as const,
  /** One page of the recent scans */
  scanHistory: (page: number, pageSize: number) => [ADMIN, "scanHistory", page, pageSize] as const,
  nailists: () => [ADMIN, "nailists"] as const,
  /** A page of the dashboard's To act on queue: under "appointments", so a change to a booking refreshes it */
  attention: (tab: string, page: number, pageSize: number) => [ADMIN, "appointments", "attention", tab, page, pageSize] as const,
  /** The bell's notifications of new bookings */
  notifications: () => [ADMIN, "notifications"] as const,
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
  /** The nail photos added to any completed visit */
  visitPhotos: ({ getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.visitPhotos(), queryFn: async () => fetchVisitPhotos(await getToken(), clerkId) }),
  /** The nail photos added to visits an artist completed */
  nailistVisitPhotos: (id: number, { getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.nailistVisitPhotos(id), queryFn: async () => fetchNailistVisitPhotos(id, await getToken(), clerkId) }),
  /** The nail photos added to a service's completed visits */
  serviceVisitPhotos: (serviceId: number, { getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.serviceVisitPhotos(serviceId), queryFn: async () => fetchServiceVisitPhotos(serviceId, await getToken(), clerkId) }),
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
  /**
   * The bell's list, a page of 5 at a time: the newest first, then older ones as the admin
   * scrolls. A refetch (the 30s poll) asks for the pages again in order, each from the one before
   * it, so a new notification pushing one onto the next page leaves no gap.
   */
  notifications: ({ getToken, clerkId }: AdminSession) =>
    infiniteQueryOptions({
      queryKey: adminKeys.notifications(),
      queryFn: async ({ pageParam }) => fetchAdminNotifications(await getToken(), clerkId, pageParam),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (last) => (last.hasMore ? last.notifications.at(-1)?.id : undefined),
    }),
  /** Every artist (the Artists editor, the appointment list's artist filter) */
  nailists: () => queryOptions({ queryKey: adminKeys.nailists(), queryFn: (): Promise<Nailist[]> => fetchNailists() }),
  scanHistory: (page: number, pageSize: number, { getToken, clerkId }: AdminSession) =>
    queryOptions({ queryKey: adminKeys.scanHistory(page, pageSize), queryFn: async () => fetchScanHistory(page, pageSize, await getToken(), clerkId) }),
};

// The admin data that shows appointments, a client's stamps or their visits
const APPOINTMENT_VIEWS = new Set<unknown>(["appointments", "dashboard", "utilization", "schedule", "clients", "proofs", "leads"]);

/**
 * After an admin changes an appointment or a client's stamps: what shows them (the lists, the
 * schedule, the dashboard and artist utilization, a client's page, the proofs, the warm leads) is
 * marked stale, and what's on screen is fetched again, as are the artists' taken times (the artist
 * editor's Day Off card marks booked days from them). The directory and its Clerk details aren't:
 * they don't change with an appointment, and fetching them asks Clerk.
 */
export function adminDataChanged(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [ADMIN], predicate: (query) => APPOINTMENT_VIEWS.has(query.queryKey[1]) }),
    queryClient.invalidateQueries({ queryKey: [BOOKING, "booked"] }),
  ]);
}

/** After an admin is added, edited or removed: the directory's lists are fetched again */
export function directoryChanged(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: [ADMIN, "directory"] });
}
