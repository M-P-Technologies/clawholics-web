"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { keepPreviousData, useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { scheduleClientName } from "../../services/scheduleAgenda";
import { buildDayData, formatLocalMonth, getArtistName, parseLocalDate, serviceNamesOf, weekLabel } from "../../lib/admin/schedule";
import { isDesktopWidth } from "../../lib/viewport";
import { adminDataChanged, adminQueries } from "../../lib/adminQueries";
import { updateAppointmentStatus, type Appointment, type AppointmentStatus } from "../../services/appointmentService";
import { addDays, mergeSchedules, toDateKey, weekDays, weekMonthKeys } from "../../services/scheduleAgenda";
import type { MonthlySchedule, ScheduleAppointment } from "../../services/scheduleService";

type PhoneView = "agenda" | "month";

// The months loaded so far as one schedule: moving to a month not loaded yet keeps the screen up
// with the others while it comes in
function combineMonths(results: UseQueryResult<MonthlySchedule>[]) {
  const loaded = results.flatMap((result) => (result.data ? [result.data] : []));
  return {
    schedule: loaded.length > 0 ? loaded.reduce(mergeSchedules) : null,
    pending: results.some((result) => result.isPending),
    error: results.find((result) => result.isError && !result.data)?.error ?? null,
  };
}

// The admin Schedule's data and state: the loaded months, the week (computer) or day and month
// (phone) on show, the filters, and the open day and appointment.
export function useSchedule() {
  const toast = useToast();
  const { getToken, isLoaded } = useAuth();
  const { user: currentUser } = useUser();
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
  const [filterBy, setFilterBy] = useState("All");

  // Phone: the day shown in the agenda, which view is open, and the filter sheet
  const [agendaDate, setAgendaDate] = useState(() => new Date());
  const [phoneView, setPhoneView] = useState<PhoneView>("agenda");

  // Which layout is drawn: the week grid from lg up, the agenda below. Decided in the browser (the
  // server and the first render assume a phone) and again when the window is resized.
  const [desktop, setDesktop] = useState(false);
  // Nothing is fetched until the layout is known, so a computer doesn't first load a phone's months
  const [layoutKnown, setLayoutKnown] = useState(false);
  useEffect(() => {
    const update = () => setDesktop(isDesktopWidth());
    update();
    setLayoutKnown(true);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Desktop: the week shown in the grid, and its search and service filter
  const [weekDate, setWeekDate] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [service, setService] = useState("All");

  const queryClient = useQueryClient();
  const session = { getToken, clerkId: currentUser?.id };

  // The shown month, plus on a phone the other month(s) the agenda's week touches, so the week
  // strip's dots are right across a month end
  const weekKey = weekMonthKeys(agendaDate).join(",");
  // On desktop, the month(s) the grid's week touches
  const deskKey = weekMonthKeys(weekDate).join(",");
  // Nothing is asked before Clerk's session has loaded (a request without it is refused)
  const monthKeys = !layoutKnown || !isLoaded ? [] : desktop ? deskKey.split(",") : [...new Set([formatLocalMonth(month), ...weekKey.split(",")])];

  // Each month is a cached query: a month already seen shows at once, and the grid keeps the
  // previous week up while the next one loads
  const months = useQueries({
    queries: monthKeys.map((key) => ({ ...adminQueries.scheduleMonth(key, session), placeholderData: keepPreviousData })),
    combine: combineMonths,
  });
  // The last schedule shown stays up while a week or month not loaded yet comes in
  const [shown, setShown] = useState<MonthlySchedule | null>(null);
  if (months.schedule && months.schedule !== shown) setShown(months.schedule);
  const scheduleData = months.schedule ?? shown;
  // The full-screen loader is for the first load only; moving to another month keeps the screen up
  const isLoading = !scheduleData && (months.pending || !layoutKnown || !isLoaded);

  useEffect(() => {
    if (!months.error) return;
    console.error(months.error);
    toast.show("error", "Couldn't load the schedule", "We couldn't load the schedule, so the calendar may look empty. Please refresh the page to try again.");
    // Once per failure: the toast helper isn't a reason to show it again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months.error]);

  // The data is loaded a month at a time, so a day in another month brings that month in
  const selectAgendaDate = (date: Date) => {
    setAgendaDate(date);
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  /** A day of the month grid was tapped: the agenda on a phone, the day's details on a computer */
  const openDate = (dateKey: string) => {
    const parsedDate = parseLocalDate(dateKey);
    if (!parsedDate) {
      console.error("Invalid selected date:", dateKey);
      return;
    }
    if (!isDesktopWidth()) {
      setAgendaDate(parsedDate);
      setPhoneView("agenda");
      return;
    }
    setSelectedDate(dateKey);
  };

  const changeAppointmentStatus = async (id: number, status: AppointmentStatus) => {
    const updated = await updateAppointmentStatus(id, status, await getToken(), currentUser?.id);
    setSelectedAppointment(updated as ScheduleAppointment);
    // The schedule, the lists and the dashboard all show it
    await adminDataChanged(queryClient);
  };

  // The phone's agenda and month show only the bookings matching the search and the service
  const q = query.trim().toLowerCase();
  const narrow = (artists: ReturnType<typeof buildDayData>) =>
    artists.map((artist) => ({
      ...artist,
      appointments: artist.appointments.filter(
        (a) => (service === "All" || a.service_name === service) && (!q || scheduleClientName(a).toLowerCase().includes(q) || (a.service_name ?? "").toLowerCase().includes(q)),
      ),
    }));

  const gridDays = weekDays(weekDate);
  const selectedDay = selectedDate ? parseLocalDate(selectedDate) : null;
  return {
    isLoading,
    desktop,
    scheduleData,
    dayData: (date: Date) => narrow(buildDayData(scheduleData, date, filterBy)),
    /** The artists' names, for the artist filter */
    artistNames: (scheduleData?.nailists ?? []).map((artist) => ({ id: artist.id, name: getArtistName(artist) })),
    serviceNames: serviceNamesOf(scheduleData),
    filterBy,
    setFilterBy,
    query,
    setQuery,
    service,
    setService,
    // Desktop week grid
    gridDays,
    todayKey: toDateKey(new Date()),
    weekLabel: weekLabel(gridDays),
    previousWeek: () => setWeekDate(addDays(weekDate, -7)),
    nextWeek: () => setWeekDate(addDays(weekDate, 7)),
    thisWeek: () => setWeekDate(new Date()),
    // Phone agenda and month
    phoneView,
    showPhoneView: (view: PhoneView) => {
      setPhoneView(view);
      if (view === "agenda") selectAgendaDate(agendaDate);
    },
    agendaDate,
    selectAgendaDate,
    month,
    setMonth,
    previousMonth: () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)),
    nextMonth: () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)),
    // The open day and appointment
    selectedDate,
    /** The open day's artists and their bookings */
    selectedDayArtists: selectedDay ? narrow(buildDayData(scheduleData, selectedDay, filterBy)) : null,
    openDate,
    openDay: setSelectedDate,
    closeDay: () => {
      setSelectedDate(null);
      setSelectedAppointment(null);
    },
    /** The open appointment, in the shape the details drawer takes */
    selectedAppointment: selectedAppointment as Appointment | null,
    openAppointment: setSelectedAppointment,
    closeAppointment: () => setSelectedAppointment(null),
    changeAppointmentStatus,
  };
}
