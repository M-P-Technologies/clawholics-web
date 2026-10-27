"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN } from "@/lib/adminQueries";
import { bookingQueries } from "@/lib/bookingQueries";
import { useToast, type SortableHandleProps } from "@/components/molecules";
import { itemName, upperFirst } from "@/lib/itemName";
import {
  createNailist,
  deleteNailist,
  fetchNailistServices,
  updateNailist,
  updateNailistDayOffs,
  updateNailistServices,
  updateNailistTimeSlots,
  type Nailist,
  type NailistDayOffs,
  type NailistTimeSlots,
} from "@/services/nailistService";
import { fetchServices, type NailService } from "@/services/serviceService";
import { uploadImage } from "@/services/uploadService";
import { splitTimeSlot } from "@/lib/admin/artistEditor";
import { useFillForm } from "./useFillForm";

// The artist's services, as the editor shows them, cached per artist
const artistServicesKey = (nailistId: number) => [ADMIN, "nailists", nailistId, "services"] as const;

export type ArtistEditorProps = {
  nailist?: Nailist;
  mode?: "edit" | "create";
  onNailistUpdated?: (updatedNailist: Nailist) => void;
  onNailistCreated?: (createdNailist: Nailist) => void;
  onNailistDeleted?: (nailistId: number) => void;
  /** After a work photo is added or removed (they save at once) */
  onGalleryChanged?: () => void;
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  /** From a SortableList: the handle that drags this card, and whether it is being dragged */
  dragHandleProps?: SortableHandleProps;
  isDragging?: boolean;
};

// One artist's card in the Nail Artists editor (or the Add Artist card): the fields being
// edited, what they were when last saved (for Cancel), and saving, deleting and the photo upload.
export function useArtistEditor({
  nailist,
  mode = "edit",
  onNailistUpdated,
  onNailistCreated,
  onNailistDeleted,
  tokenFetcher,
  clerkId,
}: ArtistEditorProps) {
  const toast = useToast();
  const isCreateMode = mode === "create";

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [name, setName] = useState(nailist?.name ?? "");
  const [position, setPosition] = useState(nailist?.position ?? "");
  const [specialty, setSpecialty] = useState(nailist?.specialty ?? "");
  const [bio, setBio] = useState(nailist?.bio ?? "");
  const [image, setImage] = useState(nailist?.image ?? "");

  const queryClient = useQueryClient();
  // Every artist card offers the same services: one cached request for all of them
  const servicesQuery = useQuery({ queryKey: [ADMIN, "services"], queryFn: (): Promise<NailService[]> => fetchServices() });
  const availableServices = servicesQuery.data ?? [];
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(nailist?.service_ids ?? []);
  const [originalSelectedServiceIds, setOriginalSelectedServiceIds] = useState<number[]>(nailist?.service_ids ?? []);

  const [regularDays, setRegularDays] = useState<number[]>([]);
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [originalRegularDays, setOriginalRegularDays] = useState<number[]>([]);
  const [originalCustomDates, setOriginalCustomDates] = useState<string[]>([]);

  const [timeSlots, setTimeSlots] = useState<NailistTimeSlots>([]);
  const [originalTimeSlots, setOriginalTimeSlots] = useState<NailistTimeSlots>([]);

  const [originalName, setOriginalName] = useState(nailist?.name ?? "");
  const [originalPosition, setOriginalPosition] = useState(nailist?.position ?? "");
  const [originalSpecialty, setOriginalSpecialty] = useState(nailist?.specialty ?? "");
  const [originalBio, setOriginalBio] = useState(nailist?.bio ?? "");
  const [originalImage, setOriginalImage] = useState(nailist?.image ?? "");

  // Shows the saved details (and remembers them as what Cancel goes back to)
  const showSaved = (artist: Pick<Nailist, "name" | "position" | "specialty" | "bio" | "image">) => {
    setName(artist.name);
    setPosition(artist.position);
    setSpecialty(artist.specialty);
    setBio(artist.bio);
    setImage(artist.image);
    setOriginalName(artist.name);
    setOriginalPosition(artist.position);
    setOriginalSpecialty(artist.specialty);
    setOriginalBio(artist.bio);
    setOriginalImage(artist.image);
  };
  const showSavedServices = (ids: number[]) => {
    setSelectedServiceIds(ids);
    setOriginalSelectedServiceIds(ids);
  };

  useEffect(() => {
    if (servicesQuery.isError) console.error("Failed to fetch services:", servicesQuery.error);
  }, [servicesQuery.isError, servicesQuery.error]);

  useEffect(() => {
    if (!isCreateMode && nailist) {
      showSaved(nailist);
      showSavedServices(nailist.service_ids ?? []);
    }
  }, [nailist, isCreateMode]);

  const nailistServicesQuery = useQuery({
    queryKey: artistServicesKey(nailist?.id ?? 0),
    queryFn: () => fetchNailistServices(nailist?.id ?? 0),
    enabled: !isCreateMode && !!nailist,
  });
  useFillForm(nailistServicesQuery.data, isEditing, showSavedServices);
  useEffect(() => {
    if (nailistServicesQuery.isError) console.error("Failed to fetch artist services:", nailistServicesQuery.error);
  }, [nailistServicesQuery.isError, nailistServicesQuery.error]);

  const handleDayOffsLoaded = (dayOffs: NailistDayOffs) => {
    setRegularDays(dayOffs.regularDays);
    setCustomDates(dayOffs.customDates);
    setOriginalRegularDays(dayOffs.regularDays);
    setOriginalCustomDates(dayOffs.customDates);
  };

  const handleTimeSlotsLoaded = (loadedTimeSlots: NailistTimeSlots) => {
    setTimeSlots(loadedTimeSlots);
    setOriginalTimeSlots(loadedTimeSlots);
  };

  const toggleService = (serviceId: number) => {
    if (!isEditing || isSaving || isDeleting) return;

    setSelectedServiceIds((prevIds) =>
      prevIds.includes(serviceId) ? prevIds.filter((id) => id !== serviceId) : [...prevIds, serviceId]
    );
  };

  const resetCreateForm = () => {
    showSaved({ name: "", position: "", specialty: "", bio: "", image: "" });
    showSavedServices([]);
    handleDayOffsLoaded({ regularDays: [], customDates: [] });
    handleTimeSlotsLoaded([]);

    setIsOpen(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isCreateMode) {
      resetCreateForm();
      return;
    }

    setName(originalName);
    setPosition(originalPosition);
    setSpecialty(originalSpecialty);
    setBio(originalBio);
    setImage(originalImage);
    setSelectedServiceIds(originalSelectedServiceIds);
    setRegularDays(originalRegularDays);
    setCustomDates(originalCustomDates);
    setTimeSlots(originalTimeSlots);

    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedPosition = position.trim();
    const trimmedSpecialty = specialty.trim();
    const trimmedBio = bio.trim();
    const trimmedImage = image.trim();
    const who = itemName(trimmedName, "this artist");
    if (!trimmedName || !trimmedPosition || !trimmedSpecialty || !trimmedBio || !trimmedImage) {
      toast.show("error", "Some fields are empty", `Please fill in every field${trimmedName ? ` for ${who}` : ""} before saving. Nothing was saved.`);
      return;
    }

    const invalidTimeSlot = timeSlots.some((slot) => {
      const { startTime, endTime } = splitTimeSlot(slot);
      return !startTime || !endTime || startTime >= endTime;
    });
    if (invalidTimeSlot) {
      toast.show("error", "Finish the time slots", `Every time slot for ${who} needs both a start time and an end time before you can save.`);
      return;
    }

    try {
      setIsSaving(true);
      const token = tokenFetcher ? await tokenFetcher() : null;
      const serviceIds = Array.from(new Set(selectedServiceIds)).sort((a, b) => a - b);

      if (isCreateMode) {
        const createdNailist = await createNailist(trimmedName, trimmedPosition, trimmedSpecialty, trimmedBio, trimmedImage, token, clerkId);
        const updatedServiceIds = await updateNailistServices(createdNailist.id, serviceIds, token, clerkId);

        onNailistCreated?.({ ...createdNailist, service_ids: updatedServiceIds });
        resetCreateForm();
        toast.show("success", `${who} added`, `${upperFirst(who)} now appears on the Artists page. Assign services and set their schedule so clients can book them.`);
        return;
      }

      if (!nailist) return;

      const updatedNailist = await updateNailist(nailist.id, trimmedName, trimmedPosition, trimmedSpecialty, trimmedBio, trimmedImage, token, clerkId);
      const updatedServiceIds = await updateNailistServices(nailist.id, serviceIds, token, clerkId);
      const updatedDayOffs = await updateNailistDayOffs(
        nailist.id,
        {
          regularDays: Array.from(new Set(regularDays)).sort((a, b) => a - b),
          customDates: Array.from(new Set(customDates)).sort(),
        },
        token,
        clerkId
      );
      const updatedTimeSlots = await updateNailistTimeSlots(nailist.id, Array.from(new Set(timeSlots)).sort(), token, clerkId);

      showSaved(updatedNailist);
      showSavedServices(updatedServiceIds);
      handleDayOffsLoaded(updatedDayOffs);
      handleTimeSlotsLoaded(updatedTimeSlots);
      // The cached copies now match what was saved
      queryClient.setQueryData(artistServicesKey(nailist.id), updatedServiceIds);
      queryClient.setQueryData(bookingQueries.dayOffs(nailist.id).queryKey, updatedDayOffs);
      queryClient.setQueryData(bookingQueries.timeSlots(nailist.id).queryKey, updatedTimeSlots);
      setIsEditing(false);
      onNailistUpdated?.({ ...updatedNailist, service_ids: updatedServiceIds });
      toast.show("success", `${who} saved`, "Your changes are now live on the website and in booking.");
    } catch (error) {
      console.error(`Failed to ${isCreateMode ? "create" : "save"} artist:`, error);
      toast.show(
        "error",
        isCreateMode ? `${who} not created` : `${who} not saved`,
        error instanceof Error
          ? error.message
          : `We couldn't save ${who}, so the website is unchanged. Your edits are still on screen. Please try again.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!nailist) return;
    const who = itemName(nailist.name, "this artist");

    try {
      setIsDeleting(true);
      const token = tokenFetcher ? await tokenFetcher() : null;
      await deleteNailist(nailist.id, token, clerkId);
      setIsDeleteModalOpen(false);
      onNailistDeleted?.(nailist.id);
      toast.show("success", `${who} deleted`, `${upperFirst(who)} was removed from the Artists page and can no longer be booked.`);
    } catch (error) {
      console.error("Failed to delete artist:", error);
      toast.show("error", `${who} not deleted`, `We couldn't delete ${who}, so they are still listed. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    try {
      setIsUploading(true);
      const currentName = name;
      const token = tokenFetcher ? await tokenFetcher() : null;
      const data = await uploadImage(file, "nailists", token, clerkId);

      setImage(data.imageUrl);
      setName((prevName) => prevName || currentName || nailist?.name || originalName);
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.show("error", "Photo not uploaded", `We couldn't upload that photo for ${itemName(name || nailist?.name, "this artist")}. Please check that it is an image file and try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  const title = isCreateMode ? "Add Artist" : name.trim() || nailist?.name || originalName;

  return {
    isCreateMode, title,
    isOpen, setIsOpen, isEditing, setIsEditing, isSaving, isDeleting, isUploading,
    isDeleteModalOpen, setIsDeleteModalOpen, previewImageUrl, setPreviewImageUrl,
    name, setName, position, setPosition, specialty, setSpecialty, bio, setBio, image, setImage,
    availableServices, selectedServiceIds, toggleService,
    regularDays, setRegularDays, customDates, setCustomDates, handleDayOffsLoaded,
    timeSlots, setTimeSlots, handleTimeSlotsLoaded,
    handleCancel, handleSave, handleDelete, uploadPhoto,
  };
}
