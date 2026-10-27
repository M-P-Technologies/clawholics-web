import { queryOptions } from "@tanstack/react-query";
import { fetchBookedSlotsDetailed, fetchBookedSlotsRange, fetchNailists } from "../services/bookingService";
import { fetchNailistDayOffs, fetchNailistTimeSlots, type NailistDayOffs, type NailistTimeSlots } from "../services/nailistService";
import type { Nailist } from "../utils/booking";

// What the booking screens (booking, reschedule, the admin's walk-in form) read about an artist's
// availability, as TanStack Query queries: picking an artist or a day already seen shows at once.
// Taken times go stale quickly (anyone may book meanwhile), so they're refreshed after
// BOOKED_STALE_MS, and the final checks before booking ask the server with staleTime 0.

/** The first part of every booking query's key; the admin layout drops them on the way in */
export const BOOKING = "booking";

/** How long taken times count as fresh */
const BOOKED_STALE_MS = 15_000;

export const bookingQueries = {
  /** The artists who offer a service */
  artists: (serviceId: number) =>
    queryOptions({
      queryKey: [BOOKING, "artists", serviceId],
      // The endpoint can answer with an error object, so anything but a list counts as a failure
      queryFn: async (): Promise<Nailist[]> => {
        const list: unknown = await fetchNailists(serviceId);
        if (!Array.isArray(list)) throw new Error("Unexpected artist list");
        return list;
      },
    }),
  timeSlots: (nailistId: number) =>
    queryOptions({ queryKey: [BOOKING, "timeSlots", nailistId], queryFn: (): Promise<NailistTimeSlots> => fetchNailistTimeSlots(nailistId) }),
  dayOffs: (nailistId: number) =>
    queryOptions({ queryKey: [BOOKING, "dayOffs", nailistId], queryFn: (): Promise<NailistDayOffs> => fetchNailistDayOffs(nailistId) }),
  /** Every taken time from `from` to `to` (YYYY-MM-DD), in one request */
  bookedRange: (nailistId: number, from: string, to: string) =>
    queryOptions({
      queryKey: [BOOKING, "booked", nailistId, "range", from, to],
      queryFn: () => fetchBookedSlotsRange(nailistId, from, to),
      staleTime: BOOKED_STALE_MS,
    }),
  /** The times taken on one day */
  bookedDay: (nailistId: number, date: string) =>
    queryOptions({
      queryKey: [BOOKING, "booked", nailistId, "day", date],
      queryFn: async (): Promise<string[]> =>
        ((await fetchBookedSlotsDetailed(nailistId, date)) as { appointment_time: string }[]).map((s) => s.appointment_time),
      staleTime: BOOKED_STALE_MS,
    }),
};
