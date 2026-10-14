"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/apiConfig";
import {
  isOverlapping,
  toLocalDateString,
  type NailArtist,
  type Service,
} from "@/lib/admin/createAppointment";
import {
  createAdminAppointment,
  fetchBookedSlotsDetailed,
  fetchNailists,
  type AdminAppointmentPayload,
} from "@/services/bookingService";
import { useArtistAvailability } from "./useArtistAvailability";

// The create-appointment form's state: the client's details, the artist, service, date and time
// (the artist's availability is in useArtistAvailability), and the submit with its checks and error texts.
export function useCreateAppointment({ onCreated }: { onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [nailists, setNailists] = useState<NailArtist[]>([]);

  const [serviceId, setServiceId] = useState("");
  const [nailistId, setNailistId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [month, setMonth] = useState(new Date());

  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingNailists, setLoadingNailists] = useState(false);
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
  
    return services.filter((service: any) => {
      if (!service.nailist_ids) return false;
  
      const nailistIds = String(service.nailist_ids)
        .split(",")
        .map(Number);
  
      return nailistIds.includes(selectedNailist.id);
    });
  }, [services, selectedNailist]);

  const selectedPrice = useMemo(() => {
    if (!selectedService || !selectedNailist) return 0;

    return selectedNailist.category_id === 1
      ? selectedService.master_price
      : selectedService.junior_price;
  }, [selectedService, selectedNailist]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoadingServices(true);

        const res = await fetch(`${API_BASE_URL}/services`, {
          headers: { "x-clawholics-origin": "frontend" }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch services");
        }

        const data = await res.json();

        setServices(data);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load services.");
      } finally {
        setLoadingServices(false);
      }
    };

    const loadNailists = async () => {
      try {
        setLoadingNailists(true);

        const data = await fetchNailists();

        setNailists(data);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load nail artists.");
      } finally {
        setLoadingNailists(false);
      }
    };

    loadServices();
    loadNailists();
  }, []);

  const {
    timeSlots, setBookedSlots, fullyBookedDates, loadingSlots,
    isDayFullyBooked, isDisabledDate, isTimeBlocked,
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
  
    if (!selectedNailist || timeSlots.length === 0) {
      setBookedSlots([]);
      return;
    }
  
    const slots = await fetchBookedSlotsDetailed(selectedNailist.id, formatted);
    const times = slots.map(
      (slot: { appointment_time: string }) => slot.appointment_time,
    );
  
    if (isDayFullyBooked(times)) {
      setMessage("This day is already fully booked.");
      return;
    }
  
    setBookedSlots(times);
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

      const latest = await fetchBookedSlotsDetailed(
        selectedNailist.id,
        appointmentDate,
      );

      const conflict = latest.some((slot: { appointment_time: string }) =>
        isOverlapping(appointmentTime, slot.appointment_time),
      );

      if (conflict) {
        setMessage("This time slot was just booked. Please select another.");
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

      onCreated();
    } catch (err: any) {
      console.error(err);

      const errorMessage = err?.message || "";

      if (
        errorMessage.includes("SLOT_TAKEN") ||
        errorMessage.includes("slot")
      ) {
        setMessage(
          "This appointment slot has already been taken by another active appointment.",
        );
        return;
      }

      setMessage("Failed to create appointment.");
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
