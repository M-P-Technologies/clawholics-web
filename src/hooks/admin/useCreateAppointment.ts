"use client";

import { isMasterArtist } from "@/lib/artistRoles";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  isOverlapping,
  toLocalDateString,
  type NailArtist,
  type Service,
} from "@/lib/admin/createAppointment";
import { adminDataChanged } from "@/lib/adminQueries";
import { itemName } from "@/lib/itemName";
import { longDateLabel, timeRangeLabel } from "@/lib/timeFormat";
import { bookingQueries } from "@/lib/bookingQueries";
import { publicQueries } from "@/lib/publicQueries";
import { createAdminAppointment, type AdminAppointmentPayload } from "@/services/bookingService";
import { useArtistAvailability } from "./useArtistAvailability";

// The create-appointment form's state: the client's details, the artist, service, date and time
// (the artist's availability is in useArtistAvailability), and the submit with its checks and error texts.
export function useCreateAppointment({ onCreated }: { onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const queryClient = useQueryClient();
  // The services and artists, shared with the booking pages (cached). Fetched again each time the
  // form opens (the cached copy shows meanwhile): an artist or service added in the editors a
  // moment ago must be offered
  const servicesQuery = useQuery({ ...publicQueries.services(), refetchOnMount: "always" });
  const nailistsQuery = useQuery({ ...bookingQueries.artists(0), refetchOnMount: "always" });
  const services = useMemo(() => (servicesQuery.data ?? []) as unknown as Service[], [servicesQuery.data]);
  const nailists = useMemo(() => (Array.isArray(nailistsQuery.data) ? nailistsQuery.data : []) as unknown as NailArtist[], [nailistsQuery.data]);
  const loadingServices = servicesQuery.isPending;
  const loadingNailists = nailistsQuery.isPending;

  const [serviceId, setServiceId] = useState("");
  const [nailistId, setNailistId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [month, setMonth] = useState(new Date());

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");

  const selectedService = useMemo(
    () => services.find((service) => service.id === Number(serviceId)),
    [services, serviceId],
  );

  const selectedNailist = useMemo(
    () => nailists.find((nailist) => nailist.id === Number(nailistId)),
    [nailists, nailistId],
  );

  const artistServices = useMemo(() => {
    if (!selectedNailist) return services;
  
    return services.filter((service) => {
      if (!service.nailist_ids) return false;
  
      const nailistIds = String(service.nailist_ids)
        .split(",")
        .map(Number);
  
      return nailistIds.includes(selectedNailist.id);
    });
  }, [services, selectedNailist]);

  const selectedPrice = useMemo(() => {
    if (!selectedService || !selectedNailist) return 0;

    return isMasterArtist(selectedNailist)
      ? selectedService.master_price
      : selectedService.junior_price;
  }, [selectedService, selectedNailist]);

  useEffect(() => {
    if (servicesQuery.isError) {
      console.error(servicesQuery.error);
      setMessage("Failed to load services.");
    }
  }, [servicesQuery.isError, servicesQuery.error]);

  useEffect(() => {
    if (nailistsQuery.isError) {
      console.error(nailistsQuery.error);
      setMessage("Failed to load nail artists.");
    }
  }, [nailistsQuery.isError, nailistsQuery.error]);

  const {
    timeSlots, fullyBookedDates, loadingSlots,
    isDayFullyBooked, fetchTakenTimes, isDisabledDate, isTimeBlocked,
  } = useArtistAvailability({ selectedNailist, appointmentDate, setAppointmentDate, setAppointmentTime, setMessage });

  const resetMessage = () => {
    if (message) setMessage("");
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
  
    const formatted = toLocalDateString(date);
  
    setAppointmentDate(formatted);
    setAppointmentTime("");
    resetMessage();
  
    if (!selectedNailist || timeSlots.length === 0) return;

    // Asked fresh, and kept for the day's time list
    let times: string[];
    try {
      times = await fetchTakenTimes(formatted);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load booked slots.");
      return;
    }

    if (isDayFullyBooked(times)) {
      setMessage("This day is already fully booked.");
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    try {
      resetMessage();
      setSubmitting(true);

      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !phone.trim() ||
        !selectedNailist ||
        !selectedService ||
        !appointmentDate ||
        !appointmentTime
      ) {
        setMessage("Please complete all required fields.");
        return;
      }

      const latest = await fetchTakenTimes(appointmentDate);

      const conflict = latest.some((taken) => isOverlapping(appointmentTime, taken));

      if (conflict) {
        setMessage(`${itemName(selectedNailist?.name, "That artist")} was just booked at ${timeRangeLabel(appointmentTime)} on ${longDateLabel(appointmentDate)}. Please select another time.`);
        setAppointmentTime("");
        return;
      }

      const payload: AdminAppointmentPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        service_id: selectedService.id,
        service_name: selectedService.name,
        nailist_id: selectedNailist.id,
        nailist_name: selectedNailist.name,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      };

      await createAdminAppointment(payload);
      // The new booking shows on every admin screen
      void adminDataChanged(queryClient);

      onCreated();
    } catch (err) {
      console.error(err);

      const errorMessage = (err as { message?: string } | null)?.message || "";

      if (
        errorMessage.includes("SLOT_TAKEN") ||
        errorMessage.includes("slot")
      ) {
        setMessage(
          `${itemName(selectedNailist?.name, "The artist")} already has another active appointment at ${timeRangeLabel(appointmentTime)} on ${longDateLabel(appointmentDate)}.`,
        );
        return;
      }

      setMessage(`Failed to create the appointment${selectedNailist ? ` with ${selectedNailist.name}` : ""}${selectedService ? ` for ${selectedService.name}` : ""}.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Choosing an artist clears the service (the date and time are cleared by the availability load)
  const chooseArtist = (id: string) => {
    setNailistId(id);
    setServiceId("");
  };

  return {
    firstName, setFirstName, lastName, setLastName, phone, setPhone, email, setEmail,
    nailists, timeSlots, fullyBookedDates,
    serviceId, setServiceId, nailistId, chooseArtist,
    appointmentDate, appointmentTime, setAppointmentTime, month, setMonth,
    loadingServices, loadingNailists, loadingSlots, submitting, message,
    selectedService, selectedNailist, artistServices, selectedPrice,
    isDisabledDate, isTimeBlocked, handleDateSelect, handleSubmit,
  };
}

export type CreateAppointment = ReturnType<typeof useCreateAppointment>;
