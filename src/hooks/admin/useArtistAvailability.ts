"use client";

import { useEffect, useState } from "react";
import { isOverlapping, toLocalDateString, type NailArtist } from "@/lib/admin/createAppointment";
import { fetchBookedSlotsDetailed } from "@/services/bookingService";
import { fetchNailistDayOffs, fetchNailistTimeSlots } from "@/services/nailistService";

interface Options {
  selectedNailist: NailArtist | undefined;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  setAppointmentTime: (time: string) => void;
  setMessage: (message: string) => void;
}

// The chosen artist's availability for the create-appointment form: time slots, days off, the
// fully booked days of the coming month and the chosen date's booked slots. A new artist clears the
// date and time; a new date clears the time.
export function useArtistAvailability({
  selectedNailist,
  appointmentDate,
  setAppointmentDate,
  setAppointmentTime,
  setMessage,
}: Options) {
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dayOffs, setDayOffs] = useState<number[]>([]);
  const [customOffs, setCustomOffs] = useState<string[]>([]);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isDayFullyBooked = (booked: string[]) => {
    if (timeSlots.length === 0) return false;
  
    return timeSlots.every((slot) =>
      booked.some((bookedSlot) => isOverlapping(bookedSlot, slot))
    );
  };

  const isDisabledDate = (date: Date) => {
    if (selectedNailist) {
      if (dayOffs.includes(date.getDay())) return true;
  
      const formatted = toLocalDateString(date);
  
      if (customOffs.includes(formatted)) return true;
  
      if (fullyBookedDates.includes(formatted)) return true;
    }
  
    return false;
  };

  const isTimeBlocked = (slot: string) => {
    return bookedSlots.some((bookedSlot) => isOverlapping(bookedSlot, slot));
  };

  useEffect(() => {
    const loadNailistAvailability = async () => {
      try {
        setAppointmentDate("");
        setAppointmentTime("");
        setBookedSlots([]);
        setTimeSlots([]);
        setDayOffs([]);
        setCustomOffs([]);
        setFullyBookedDates([]);

        if (!selectedNailist) return;

        setLoadingSlots(true);

        const slots = await fetchNailistTimeSlots(selectedNailist.id);
        const offs = await fetchNailistDayOffs(selectedNailist.id);

        setTimeSlots(
          slots.map((slot: any) =>
            typeof slot === "string"
              ? slot
              : `${slot.start_time}-${slot.end_time}`
          )
        );        setDayOffs(offs.regularDays || []);
        setCustomOffs(offs.customDates || []);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load nail artist availability.");
      } finally {
        setLoadingSlots(false);
      }
    };

    loadNailistAvailability();
  }, [selectedNailist, setAppointmentDate, setAppointmentTime, setMessage]);

  useEffect(() => {
    const loadMonthAvailability = async () => {
      if (!selectedNailist || timeSlots.length === 0) return;

      const start = new Date();
      const end = new Date();

      end.setMonth(end.getMonth() + 1);

      const promises = [];

      for (
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + 1)
      ) {
        const formatted = toLocalDateString(date);

        promises.push(
          fetchBookedSlotsDetailed(selectedNailist.id, formatted).then(
            (slots) => ({
              date: formatted,
              times: slots.map(
                (slot: { appointment_time: string }) =>
                  slot.appointment_time,
              ),
            }),
          ),
        );
      }

      const results = await Promise.all(promises);

      const dates = results
      .filter((result) => isDayFullyBooked(result.times))
      .map((result) => result.date);

      setFullyBookedDates(dates);
    };

    loadMonthAvailability();
  }, [selectedNailist, timeSlots]);

  useEffect(() => {
    const loadBookedSlots = async () => {
      try {
        setAppointmentTime("");
        setBookedSlots([]);

        if (!selectedNailist || !appointmentDate) return;

        const booked = await fetchBookedSlotsDetailed(
          selectedNailist.id,
          appointmentDate,
        );

        setBookedSlots(
          booked.map(
            (slot: { appointment_time: string }) => slot.appointment_time,
          ),
        );
      } catch (err) {
        console.error(err);
        setMessage("Failed to load booked slots.");
      }
    };

    loadBookedSlots();
  }, [selectedNailist, appointmentDate, setAppointmentTime, setMessage]);

  return {
    timeSlots, bookedSlots, setBookedSlots, fullyBookedDates, loadingSlots,
    isDayFullyBooked, isDisabledDate, isTimeBlocked,
  };
}
