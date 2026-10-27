"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { itemName } from "@/lib/itemName";
import { bookingQueries } from "@/lib/bookingQueries";
import type { NailistTimeSlots } from "@/services/nailistService";
import { splitTimeSlot } from "@/lib/admin/artistEditor";
import { useFillForm } from "./useFillForm";

type Options = {
  nailistId?: number;
  disabled: boolean;
  timeSlots: NailistTimeSlots;
  setTimeSlots: React.Dispatch<React.SetStateAction<NailistTimeSlots>>;
  onTimeSlotsLoaded: (timeSlots: NailistTimeSlots) => void;
  /** The artist's name, for the messages about their slots */
  artistName?: string;
};

// The artist editor's Time Slots card: loads the artist's slots and edits them. The slots
// themselves are the editor's (saved and put back with the rest); the card owns the new slot.
export function useTimeSlots({ nailistId, disabled, timeSlots, setTimeSlots, onTimeSlotsLoaded, artistName }: Options) {
  const toast = useToast();
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  // The hours, the same cached query the booking pages read
  const timeSlotsQuery = useQuery({ ...bookingQueries.timeSlots(nailistId ?? 0), enabled: !!nailistId });
  const isLoading = !!nailistId && timeSlotsQuery.isPending;
  useFillForm(timeSlotsQuery.data, !disabled, onTimeSlotsLoaded);
  useEffect(() => {
    if (timeSlotsQuery.isError) console.error("Failed to fetch time slots:", timeSlotsQuery.error);
  }, [timeSlotsQuery.isError, timeSlotsQuery.error]);

  const updateTimeSlot = (
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    if (disabled) return;

    setTimeSlots((prevSlots) =>
      prevSlots.map((slot, currentIndex) => {
        if (currentIndex !== index) return slot;

        const { startTime, endTime } = splitTimeSlot(slot);

        return field === "startTime"
          ? `${value}-${endTime}`
          : `${startTime}-${value}`;
      })
    );
  };

  const deleteTimeSlot = (index: number) => {
    if (disabled) return;

    setTimeSlots((prevSlots) =>
      prevSlots.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const handleAddTimeSlot = () => {
    if (disabled) return;

    if (!newStartTime || !newEndTime) {
      toast.show("error", "Add both times", "Please enter a start time and an end time for the time slot.");
      return;
    }

    if (newStartTime >= newEndTime) {
      toast.show("error", "Check the times", "The start time must be earlier than the end time.");
      return;
    }

    const newTimeSlot = `${newStartTime}-${newEndTime}`;

    if (timeSlots.includes(newTimeSlot)) {
      toast.show("error", "Duplicate time slot", `${itemName(artistName, "This artist")} already has that time slot. Please choose different times.`);
      return;
    }

    setTimeSlots((prevSlots) =>
      Array.from(new Set([...prevSlots, newTimeSlot])).sort()
    );

    setNewStartTime("");
    setNewEndTime("");
  };

  return {
    isLoading,
    newStartTime,
    setNewStartTime,
    newEndTime,
    setNewEndTime,
    updateTimeSlot,
    deleteTimeSlot,
    handleAddTimeSlot,
  };
}
