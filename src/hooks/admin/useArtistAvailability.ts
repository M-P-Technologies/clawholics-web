"use client";

import { useEffect } from "react";
import { isOverlapping, toLocalDateString, type NailArtist } from "@/lib/admin/createAppointment";
import { useArtistAvailability as useSharedAvailability } from "../useArtistAvailability";

interface Options {
  selectedNailist: NailArtist | undefined;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  setAppointmentTime: (time: string) => void;
  setMessage: (message: string) => void;
}

// The chosen artist's availability for the create-appointment form, from the queries the booking
// pages share (hooks/useArtistAvailability): time slots, days off, the fully booked days of the
// coming month and the chosen date's taken times. A new artist clears the date and time.
export function useArtistAvailability({ selectedNailist, appointmentDate, setAppointmentDate, setAppointmentTime, setMessage }: Options) {
  const availability = useSharedAvailability(selectedNailist?.id, appointmentDate);
  const { dayOffs, customOffs, fullyBookedDates, bookedSlots, availabilityFailed, takenTimesFailed } = availability;

  useEffect(() => {
    if (availabilityFailed) setMessage("Failed to load nail artist availability.");
  }, [availabilityFailed, setMessage]);

  useEffect(() => {
    if (takenTimesFailed) setMessage("Failed to load booked slots.");
  }, [takenTimesFailed, setMessage]);

  // Another artist: their days and times are different
  useEffect(() => {
    setAppointmentDate("");
    setAppointmentTime("");
  }, [selectedNailist?.id, setAppointmentDate, setAppointmentTime]);

  const isDisabledDate = (date: Date) => {
    if (!selectedNailist) return false;
    if (dayOffs.includes(date.getDay())) return true;
    const formatted = toLocalDateString(date);
    return customOffs.includes(formatted) || fullyBookedDates.includes(formatted);
  };

  const isTimeBlocked = (slot: string) => bookedSlots.some((bookedSlot) => isOverlapping(bookedSlot, slot));

  return {
    timeSlots: availability.timeSlots,
    bookedSlots,
    fullyBookedDates,
    loadingSlots: availability.loadingTimes,
    isDayFullyBooked: availability.isDayFullyBooked,
    /** The times taken on a day, asked of the server now (and kept for its time list) */
    fetchTakenTimes: availability.fetchTakenTimes,
    isDisabledDate,
    isTimeBlocked,
  };
}
