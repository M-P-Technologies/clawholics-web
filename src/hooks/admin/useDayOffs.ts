"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bookingQueries } from "@/lib/bookingQueries";
import type { NailistDayOffs } from "@/services/nailistService";
import { formatDateKey } from "@/lib/admin/artistEditor";
import { useFillForm } from "./useFillForm";

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

  // The booked days of the month shown, from the slot-holding bookings of this artist only (the
  // same query as the booking calendar), not every appointment
  const monthStart = formatDateKey(month);
  const monthEnd = formatDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const bookedQuery = useQuery({ ...bookingQueries.bookedRange(nailistId ?? 0, monthStart, monthEnd), enabled: !!nailistId });
  useEffect(() => {
    if (bookedQuery.isError) console.error("Failed to fetch booked dates:", bookedQuery.error);
  }, [bookedQuery.isError, bookedQuery.error]);
  const bookedDates = useMemo(
    () => new Set((bookedQuery.data ?? []).map((slot) => slot.appointment_date)),
    [bookedQuery.data],
  );

  const isDayOff = (date: Date) => {
    const dateKey = formatDateKey(date);

    return regularDays.includes(date.getDay()) || customDates.includes(dateKey);
  };

  const isBookedDay = (date: Date) => {
    return bookedDates.has(formatDateKey(date));
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
