"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bookingQueries } from "@/lib/bookingQueries";
import { ADMIN_APPOINTMENTS_KEY, fetchAppointments } from "@/services/appointmentService";
import type { NailistDayOffs } from "@/services/nailistService";
import { formatDateKey } from "@/lib/admin/artistEditor";
import { useFillForm } from "./useFillForm";

// Every artist's calendar marks booked days from the same appointment list, so the cards opened
// together share one cached query instead of each asking for all the appointments
const allAppointmentsQuery = {
  queryKey: [...ADMIN_APPOINTMENTS_KEY, "all"],
  queryFn: () => fetchAppointments(),
  staleTime: 30_000,
};

type Options = {
  nailistId?: number;
  disabled: boolean;
  regularDays: number[];
  customDates: string[];
  setRegularDays: React.Dispatch<React.SetStateAction<number[]>>;
  setCustomDates: React.Dispatch<React.SetStateAction<string[]>>;
  onDayOffsLoaded: (dayOffs: NailistDayOffs) => void;
};

// The artist editor's Day Off card: loads the artist's day offs and booked days and toggles
// them. The day offs themselves are the editor's (saved and put back with the rest).
export function useDayOffs({
  nailistId,
  disabled,
  regularDays,
  customDates,
  setRegularDays,
  setCustomDates,
  onDayOffsLoaded,
}: Options) {
  const today = new Date();

  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  // The days off, the same cached query the booking pages read
  const dayOffsQuery = useQuery({ ...bookingQueries.dayOffs(nailistId ?? 0), enabled: !!nailistId });
  const isLoading = !!nailistId && dayOffsQuery.isPending;
  useFillForm(dayOffsQuery.data, !disabled, onDayOffsLoaded);
  useEffect(() => {
    if (dayOffsQuery.isError) console.error("Failed to fetch day offs:", dayOffsQuery.error);
  }, [dayOffsQuery.isError, dayOffsQuery.error]);

  const appointmentsQuery = useQuery({ ...allAppointmentsQuery, enabled: !!nailistId });
  useEffect(() => {
    if (appointmentsQuery.isError) console.error("Failed to fetch booked dates:", appointmentsQuery.error);
  }, [appointmentsQuery.isError, appointmentsQuery.error]);
  const bookedDates = useMemo(() => {
    const dates = (appointmentsQuery.data ?? [])
      .filter((appointment) => {
        const status = appointment.status.toLowerCase();

        return (
          appointment.nailist_id === nailistId &&
          status !== "cancelled" &&
          status !== "canceled" &&
          status !== "rejected"
        );
      })
      .map((appointment) => appointment.appointment_date);
    return Array.from(new Set(dates));
  }, [appointmentsQuery.data, nailistId]);

  const isDayOff = (date: Date) => {
    const dateKey = formatDateKey(date);

    return regularDays.includes(date.getDay()) || customDates.includes(dateKey);
  };

  const isBookedDay = (date: Date) => {
    return bookedDates.includes(formatDateKey(date));
  };

  const toggleRegularDay = (day: number) => {
    if (disabled) return;

    setRegularDays((prevDays) =>
      prevDays.includes(day)
        ? prevDays.filter((currentDay) => currentDay !== day)
        : [...prevDays, day]
    );
  };

  const toggleCustomDate = (date: Date) => {
    if (disabled) return;

    const dateKey = formatDateKey(date);

    setCustomDates((prevDates) =>
      prevDates.includes(dateKey)
        ? prevDates.filter((currentDate) => currentDate !== dateKey)
        : [...prevDates, dateKey]
    );
  };

  return { month, setMonth, isLoading, isDayOff, isBookedDay, toggleRegularDay, toggleCustomDate };
}
