import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingQueries } from "@/lib/tanstack-query/bookingQueries";
import { isOverlapping, toLocalDateString } from "../lib/reschedule";

const NONE: never[] = [];

/** Today and a month ahead (YYYY-MM-DD), the days a booking can be made on */
function bookableRange() {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return { from: toLocalDateString(start), to: toLocalDateString(end) };
}

/**
 * An artist's availability for the booking calendars (booking, reschedule, the admin's walk-in
 * form), from the shared booking queries: their hours, days off, the next month's fully booked
 * days (in one request) and the times taken on the chosen day. Without an artist, all are empty.
 */
export function useArtistAvailability(nailistId: number | null | undefined, selectedDate: string) {
  const queryClient = useQueryClient();
  const id = nailistId ?? 0;
  const timeSlotsQuery = useQuery({ ...bookingQueries.timeSlots(id), enabled: !!nailistId });
  const timeSlots = timeSlotsQuery.data ?? NONE;
  const dayOffsQuery = useQuery({ ...bookingQueries.dayOffs(id), enabled: !!nailistId });
  const dayOffs = dayOffsQuery.data;
  const { from, to } = bookableRange();
  // Without it the calendar just marks no day as full: picking one still checks that day
  const booked = useQuery({ ...bookingQueries.bookedRange(id, from, to), enabled: !!nailistId && timeSlots.length > 0 }).data;
  const bookedDayQuery = useQuery({ ...bookingQueries.bookedDay(id, selectedDate), enabled: !!nailistId && !!selectedDate });
  const bookedSlots = bookedDayQuery.data ?? NONE;

  /** Every one of the artist's times overlaps one of these taken times */
  const isDayFullyBooked = useCallback(
    (taken: string[]) => timeSlots.length > 0 && timeSlots.every((slot) => taken.some((b) => isOverlapping(b, slot))),
    [timeSlots],
  );

  // Only a day with bookings can be fully booked
  const fullyBookedDates = useMemo(() => {
    const timesByDate = new Map<string, string[]>();
    for (const { appointment_date, appointment_time } of booked ?? []) {
      timesByDate.set(appointment_date, [...(timesByDate.get(appointment_date) ?? []), appointment_time]);
    }
    return [...timesByDate].filter(([, times]) => isDayFullyBooked(times)).map(([date]) => date);
  }, [booked, isDayFullyBooked]);

  /** The times taken on a day, asked of the server now (and kept for its time list) */
  const fetchTakenTimes = useCallback(
    (date: string) => queryClient.fetchQuery({ ...bookingQueries.bookedDay(id, date), staleTime: 0 }),
    [queryClient, id],
  );

  return {
    timeSlots,
    /** The chosen artist's hours are on their way */
    loadingTimes: !!nailistId && timeSlotsQuery.isPending,
    /** The artist's hours or days off couldn't be loaded */
    availabilityFailed: (timeSlotsQuery.isError && !timeSlotsQuery.data) || (dayOffsQuery.isError && !dayOffsQuery.data),
    /** The chosen day's taken times couldn't be loaded */
    takenTimesFailed: bookedDayQuery.isError && !bookedDayQuery.data,
    dayOffs: dayOffs?.regularDays ?? NONE,
    customOffs: dayOffs?.customDates ?? NONE,
    fullyBookedDates,
    bookedSlots,
    isDayFullyBooked,
    fetchTakenTimes,
  };
}
