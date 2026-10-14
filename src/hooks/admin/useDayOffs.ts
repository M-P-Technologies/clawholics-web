"use client";

import React, { useEffect, useState } from "react";
import { fetchAppointments } from "@/services/appointmentService";
import { fetchNailistDayOffs, type NailistDayOffs } from "@/services/nailistService";
import { formatDateKey } from "@/lib/admin/artistEditor";

// Every artist's calendar marks booked days from the same appointment list, so the cards opened
// together share one request instead of each asking for all the appointments
let sharedAppointments: { at: number; list: ReturnType<typeof fetchAppointments> } | null = null;
const appointmentsForCalendars = () => {
  if (!sharedAppointments || Date.now() - sharedAppointments.at > 30_000) {
    const list = fetchAppointments();
    sharedAppointments = { at: Date.now(), list };
    list.catch(() => {
      if (sharedAppointments?.list === list) sharedAppointments = null;
    });
  }
  return sharedAppointments.list;
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
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!nailistId) return;

    const loadDayOffs = async () => {
      try {
        setIsLoading(true);
        const data = await fetchNailistDayOffs(nailistId);
        onDayOffsLoaded(data);
      } catch (error) {
        console.error("Failed to fetch day offs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDayOffs();
  }, [nailistId]);

  useEffect(() => {
    if (!nailistId) return;

    const loadBookedDates = async () => {
      try {
        const appointments = await appointmentsForCalendars();

        const dates = appointments
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

        setBookedDates(Array.from(new Set(dates)));
      } catch (error) {
        console.error("Failed to fetch booked dates:", error);
      }
    };

    loadBookedDates();
  }, [nailistId]);

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
