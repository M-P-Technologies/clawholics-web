"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useToast } from "../../components/ui/ToastProvider";
import { buildDayData, formatLocalMonth, getArtistName, parseLocalDate, serviceNamesOf, weekLabel } from "../../lib/admin/schedule";
import { isDesktopWidth } from "../../lib/viewport";
import { updateAppointmentStatus, type AppointmentStatus } from "../../services/appointmentService";
import { addDays, mergeSchedules, weekDays, weekMonthKeys } from "../../services/scheduleAgenda";
import { fetchMonthlySchedule, type MonthlySchedule, type ScheduleAppointment } from "../../services/scheduleService";

export type PhoneView = "agenda" | "month";

// The admin Schedule's data and state: the loaded months, the week (computer) or day and month
// (phone) on show, the filters, and the open day and appointment.
export function useSchedule() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [month, setMonth] = useState(new Date());
  const [scheduleData, setScheduleData] = useState<MonthlySchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
  const [filterBy, setFilterBy] = useState("All");

  // Phone: the day shown in the agenda, which view is open, and the filter sheet
  const [agendaDate, setAgendaDate] = useState(() => new Date());
  const [phoneView, setPhoneView] = useState<PhoneView>("agenda");
  const [filterOpen, setFilterOpen] = useState(false);

  // Which layout is drawn: the week grid from lg up, the agenda below. Decided in the browser (the
  // server and the first render assume a phone) and again when the window is resized.
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const update = () => setDesktop(isDesktopWidth());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Desktop: the week shown in the grid, and its search and service filter
  const [weekDate, setWeekDate] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [service, setService] = useState("All");

  const [isLoading, setIsLoading] = useState(true);
  // The full-screen loader is for the first load only; moving to another month keeps the screen up
  const hasLoaded = useRef(false);

  // The shown month, plus on a phone the other month(s) the agenda's week touches, so the week
  // strip's dots are right across a month end
  const weekKey = weekMonthKeys(agendaDate).join(",");
  // On desktop, the month(s) the grid's week touches
  const deskKey = weekMonthKeys(weekDate).join(",");

  const fetchSchedule = async () => {
    const token = await getToken();
    const keys = isDesktopWidth() ? deskKey.split(",") : [...new Set([formatLocalMonth(month), ...weekKey.split(",")])];
    const results = await Promise.all(keys.map((key) => fetchMonthlySchedule(key, token, currentUser?.id)));
    return results.reduce(mergeSchedules);
  };

  const loadSchedule = async () => {
    try {
      if (!hasLoaded.current) setIsLoading(true);
      setScheduleData(await fetchSchedule());
    } catch (error) {
      console.error(error);
      toast.show("error", "Couldn't load the schedule", "We couldn't load the schedule, so the calendar may look empty. Please refresh the page to try again.");
    } finally {
      hasLoaded.current = true;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, weekKey, deskKey, currentUser?.id]);

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
    setScheduleData(await fetchSchedule());
  };

  const gridDays = weekDays(weekDate);
  return {
    isLoading,
    desktop,
    scheduleData,
    dayData: (date: Date) => buildDayData(scheduleData, date, filterBy),
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
    filterOpen,
    setFilterOpen,
    // The open day and appointment
    selectedDate,
    selectedDateObject: selectedDate ? parseLocalDate(selectedDate) : null,
    openDate,
    openDay: setSelectedDate,
    closeDay: () => {
      setSelectedDate(null);
      setSelectedAppointment(null);
    },
    selectedAppointment,
    openAppointment: setSelectedAppointment,
    closeAppointment: () => setSelectedAppointment(null),
    changeAppointmentStatus,
  };
}
