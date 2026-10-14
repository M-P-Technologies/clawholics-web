import { ArrowLeft as BackButtonIcon, Check as CheckIcon, ChevronDown as DropdownIcon, Plus as PlusIcon, Upload as UploadIcon, X as XIcon } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN } from "../../lib/adminQueries";
import { bookingQueries } from "../../lib/bookingQueries";
import { useFillForm } from "../../hooks/admin/useFillForm";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ADMIN_APPOINTMENTS_KEY, fetchAppointments } from "../../services/appointmentService";

import ImagePreviewModal from "./ImagePreviewModal";
import NailArtistGallery from "./NailArtistGallery";

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
} from "../../services/nailistService";

import { fetchServices, type NailService } from "../../services/serviceService";
import { uploadImage } from "../../services/uploadService";
import { useToast } from "../ui/ToastProvider";
import EditActions from "./EditActions";
import Button from "../ui/Button";
import ConfirmModal from "../ui/ConfirmModal";
import Select from "../ui/Select";
import { SectionSkeleton } from "./skeletons";

type NailArtistDropdownProps = {
  nailist?: Nailist;
  mode?: "edit" | "create";
  onNailistUpdated?: (updatedNailist: Nailist) => void;
  onNailistCreated?: (createdNailist: Nailist) => void;
  onNailistDeleted?: (nailistId: number) => void;
  /** After a work photo is added or removed (they save at once) */
  onGalleryChanged?: () => void;
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
};

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isEditing: boolean;
};

const POSITION_CATEGORIES = [
  "Master Technician",
  "Junior Technician",
];

const WEEK_DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const CardTitle = ({ label }: { label: string }) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-gray-red/80">{label}</h3>
      </div>

    </>
  );
};

const InputField = ({ label, value, onChange, isEditing }: InputFieldProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResizeTextarea = () => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.max(
      textareaRef.current.scrollHeight,
      32
    )}px`;
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-gray-red/80">{label}</h3>
      </div>


      <textarea
        ref={textareaRef}
        disabled={!isEditing}
        value={value}
        onChange={(e) => {
          onChange(e);
          e.currentTarget.style.height = "0px";
          e.currentTarget.style.height = `${Math.max(
            e.currentTarget.scrollHeight,
            32
          )}px`;
        }}
        className="w-full min-h-[38px] rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none resize-none overflow-hidden whitespace-pre-line focus:ring-2 focus:ring-crimson disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatTimeDisplay = (time: string) => {
  if (!time) return "";

  const [hourValue, minute] = time.split(":");
  const hour = Number(hourValue);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour.toString().padStart(2, "0")}:${minute} ${period}`;
};

const splitTimeSlot = (timeSlot: string) => {
  const [startTime = "", endTime = ""] = timeSlot
    .split("-")
    .map((value) => value.trim());

  return { startTime, endTime };
};

// Every artist's calendar marks booked days from the same appointment list, so the cards opened
// together share one cached query instead of each asking for all the appointments
const allAppointmentsQuery = {
  queryKey: [...ADMIN_APPOINTMENTS_KEY, "all"],
  queryFn: () => fetchAppointments(),
  staleTime: 30_000,
};

// The artist's services, as the editor shows them, cached per artist
const artistServicesKey = (nailistId: number) => [ADMIN, "nailists", nailistId, "services"] as const;

const DayOffCard = ({
  nailistId,
  disabled,
  regularDays,
  customDates,
  setRegularDays,
  setCustomDates,
  onDayOffsLoaded,
}: {
  nailistId?: number;
  disabled: boolean;
  regularDays: number[];
  customDates: string[];
  setRegularDays: React.Dispatch<React.SetStateAction<number[]>>;
  setCustomDates: React.Dispatch<React.SetStateAction<string[]>>;
  onDayOffsLoaded: (dayOffs: NailistDayOffs) => void;
}) => {
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

  return (
    <div className="flex flex-col gap-1.5">
      <CardTitle label="Day Off" />

      {isLoading ? (
        <SectionSkeleton label="Loading days off" lines={2} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-1">
            <p className="text-[15px] text-gray-red">Regular:</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {WEEK_DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-1 text-[14px] text-gray-red"
                >
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={regularDays.includes(day.value)}
                      disabled={disabled}
                      onChange={() => toggleRegularDay(day.value)}
                      className="
                        peer
                        w-4 h-4 appearance-none rounded-[3px]
                        border border-crimson bg-transparent
                        checked:bg-crimson
                        disabled:cursor-not-allowed
                      "
                    />

                    <CheckIcon
                      size={18} className="pointer-events-none absolute hidden peer-checked:block text-light-orange"
                    />
                  </span>

                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <p className="text-[15px] text-gray-red mb-1">Custom Dates:</p>

          {/* Calendar above its legend: the editor's side panel is narrow at every screen size */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-milk p-2 w-full flex justify-center border border-crimson-light">
              <DayPicker
                mode="multiple"
                month={month}
                onMonthChange={setMonth}
                selected={customDates.map(parseDateKey)}
                onDayClick={toggleCustomDate}
                weekStartsOn={1}
                showOutsideDays={false}
                disabled={disabled}
                modifiers={{
                  booked: isBookedDay,
                  dayOff: (date) => isDayOff(date) && !isBookedDay(date),
                  available: (date) => !isDayOff(date) && !isBookedDay(date),
                }}
                className="day-off-picker text-gray-red w-full"
                classNames={{
                  root: "relative w-full",
                  month: "w-full",
                  month_caption:
                    "flex items-center justify-center h-8 text-[13px] font-bold uppercase tracking-wide text-gray-red",
                  caption_label: "text-[13px] font-bold uppercase",
                  nav: "absolute left-0 right-0 top-0 flex items-center justify-between",
                  button_previous:
                    "w-7 h-7 flex items-center justify-center",
                  button_next:
                    "w-7 h-7 flex items-center justify-center",
                  chevron: "w-4 h-4 fill-crimson text-gray-red",
                  month_grid:
                    "w-full table-fixed border-separate border-spacing-1",
                  weekday:
                    "text-center text-[11px] font-bold text-gray-red pb-1",
                  day: "p-0 text-center",
                  day_button:
                    "w-full aspect-square rounded-sm text-[13px] font-bold text-gray-red transition-colors disabled:cursor-not-allowed",
                  outside: "opacity-0 pointer-events-none",
                }}
                components={{
                  Chevron: ({ orientation }) => (
                    <BackButtonIcon
                      size={24} className={`text-gray-red ${
                        orientation === "right" ? "rotate-180" : ""
                      }`}
                    />
                  ),
                }}
                modifiersClassNames={{
                  booked: "[&>button]:!bg-danger/40",
                  dayOff: "[&>button]:!bg-gray-red/40",
                  available: "[&>button]:!bg-success/50",
                }}
              />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="block w-4 h-4 rounded-sm bg-success/50" />
                <span className="text-[13px] text-gray-red">
                  Available
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="block w-4 h-4 rounded-sm bg-danger/40" />
                <span className="text-[13px] text-gray-red">
                  Booked
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="block w-4 h-4 rounded-sm bg-gray-red/40" />
                <span className="text-[13px] text-gray-red">
                  Day off
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const TimeSlotCard = ({
  nailistId,
  disabled,
  timeSlots,
  setTimeSlots,
  onTimeSlotsLoaded,
}: {
  nailistId?: number;
  disabled: boolean;
  timeSlots: NailistTimeSlots;
  setTimeSlots: React.Dispatch<React.SetStateAction<NailistTimeSlots>>;
  onTimeSlotsLoaded: (timeSlots: NailistTimeSlots) => void;
}) => {
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

  const openTimePicker = (wrapper: HTMLDivElement) => {
    const input = wrapper.querySelector("input");

    if (!input) return;

    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  };

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
      toast.show("error", "Duplicate time slot", "This artist already has that time slot. Please choose different times.");
      return;
    }

    setTimeSlots((prevSlots) =>
      Array.from(new Set([...prevSlots, newTimeSlot])).sort()
    );

    setNewStartTime("");
    setNewEndTime("");
  };

  const TimePill = ({
    value,
    displayValue,
    onChange,
  }: {
    value: string;
    displayValue: string;
    onChange: (value: string) => void;
  }) => {
    return disabled ? (
      <div className="w-full h-[35px] bg-milk rounded-md px-3 flex items-center text-sm text-gray-red leading-none cursor-not-allowed border border-crimson-light">
        {displayValue}
      </div>
    ) : (
      <div
        className="relative w-full h-[35px] bg-milk rounded-md px-4 flex items-center cursor-pointer border border-crimson-light"
        onClick={(e) => openTimePicker(e.currentTarget)}
      >
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-sm text-gray-red outline-none cursor-pointer appearance-none p-0 m-0 leading-none [&::-webkit-calendar-picker-indicator]:hidden"
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <CardTitle label="Time Slots" />

      {isLoading ? (
        <SectionSkeleton label="Loading time slots" lines={3} />
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className={`grid gap-4 items-center ${
              disabled
                ? "grid-cols-[1fr_1fr]"
                : "grid-cols-[1fr_1fr_20px]"
            }`}
          >
            <p className="text-[13px] font-bold text-center text-gray-red">
              Start Time
            </p>

            <p className="text-[13px] font-bold text-center text-gray-red">
              End Time
            </p>

            {!disabled && <div />}

            {timeSlots.length > 0 ? (
              timeSlots.map((timeSlot, index) => {
                const { startTime, endTime } = splitTimeSlot(timeSlot);

                return (
                  <React.Fragment key={`${timeSlot}-${index}`}>
                    <TimePill
                      value={startTime}
                      displayValue={formatTimeDisplay(startTime)}
                      onChange={(value) =>
                        updateTimeSlot(index, "startTime", value)
                      }
                    />

                    <TimePill
                      value={endTime}
                      displayValue={formatTimeDisplay(endTime)}
                      onChange={(value) =>
                        updateTimeSlot(index, "endTime", value)
                      }
                    />

                    {!disabled && (
                      <Button
                        variant="bare"
                        type="button"
                        onClick={() => deleteTimeSlot(index)}
                        className="flex items-center justify-center w-6 h-6"
                      >
                        <XIcon size={24} className="text-crimson" />
                      </Button>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <p
                className={`text-[15px] text-gray-red ${
                  disabled ? "col-span-2" : "col-span-3"
                }`}
              >
                No time slots available.
              </p>
            )}
          </div>

          {!disabled && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[1fr_1fr_20px] gap-4 items-center">
                <TimePill
                  value={newStartTime}
                  displayValue={formatTimeDisplay(newStartTime)}
                  onChange={setNewStartTime}
                />

                <TimePill
                  value={newEndTime}
                  displayValue={formatTimeDisplay(newEndTime)}
                  onChange={setNewEndTime}
                />

                <div />
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={handleAddTimeSlot}
                  className="w-[100px]"
                >
                  ADD
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const NailArtistDropdown: React.FC<NailArtistDropdownProps> = ({
  nailist,
  mode = "edit",
  onNailistUpdated,
  onNailistCreated,
  onNailistDeleted,
  onGalleryChanged,
  tokenFetcher,
  clerkId,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
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

  // Every artist card offers the same services: one cached request for all of them
  const servicesQuery = useQuery({ queryKey: [ADMIN, "services"], queryFn: (): Promise<NailService[]> => fetchServices() });
  const availableServices = servicesQuery.data ?? [];
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
    nailist?.service_ids ?? []
  );
  const [originalSelectedServiceIds, setOriginalSelectedServiceIds] = useState<
    number[]
  >(nailist?.service_ids ?? []);

  const [regularDays, setRegularDays] = useState<number[]>([]);
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [originalRegularDays, setOriginalRegularDays] = useState<number[]>([]);
  const [originalCustomDates, setOriginalCustomDates] = useState<string[]>([]);

  const [timeSlots, setTimeSlots] = useState<NailistTimeSlots>([]);
  const [originalTimeSlots, setOriginalTimeSlots] =
    useState<NailistTimeSlots>([]);

  const [originalName, setOriginalName] = useState(nailist?.name ?? "");
  const [originalPosition, setOriginalPosition] = useState(
    nailist?.position ?? ""
  );
  const [originalSpecialty, setOriginalSpecialty] = useState(
    nailist?.specialty ?? ""
  );
  const [originalBio, setOriginalBio] = useState(nailist?.bio ?? "");
  const [originalImage, setOriginalImage] = useState(nailist?.image ?? "");

  useEffect(() => {
    if (servicesQuery.isError) console.error("Failed to fetch services:", servicesQuery.error);
  }, [servicesQuery.isError, servicesQuery.error]);

  useEffect(() => {
    if (!isCreateMode && nailist) {
      setName(nailist.name);
      setPosition(nailist.position);
      setSpecialty(nailist.specialty);
      setBio(nailist.bio);
      setImage(nailist.image);

      setOriginalName(nailist.name);
      setOriginalPosition(nailist.position);
      setOriginalSpecialty(nailist.specialty);
      setOriginalBio(nailist.bio);
      setOriginalImage(nailist.image);

      setSelectedServiceIds(nailist.service_ids ?? []);
      setOriginalSelectedServiceIds(nailist.service_ids ?? []);
    }
  }, [nailist, isCreateMode]);

  const nailistServicesQuery = useQuery({
    queryKey: artistServicesKey(nailist?.id ?? 0),
    queryFn: () => fetchNailistServices(nailist?.id ?? 0),
    enabled: !isCreateMode && !!nailist,
  });
  useFillForm(nailistServicesQuery.data, isEditing, (serviceIds: number[]) => {
    setSelectedServiceIds(serviceIds);
    setOriginalSelectedServiceIds(serviceIds);
  });
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
      prevIds.includes(serviceId)
        ? prevIds.filter((id) => id !== serviceId)
        : [...prevIds, serviceId]
    );
  };

  const resetCreateForm = () => {
    setName("");
    setPosition("");
    setSpecialty("");
    setBio("");
    setImage("");

    setSelectedServiceIds([]);
    setOriginalSelectedServiceIds([]);

    setRegularDays([]);
    setCustomDates([]);
    setOriginalRegularDays([]);
    setOriginalCustomDates([]);

    setTimeSlots([]);
    setOriginalTimeSlots([]);

    setOriginalName("");
    setOriginalPosition("");
    setOriginalSpecialty("");
    setOriginalBio("");
    setOriginalImage("");

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

    if (
      !trimmedName ||
      !trimmedPosition ||
      !trimmedSpecialty ||
      !trimmedBio ||
      !trimmedImage
    ) {
      toast.show("error", "Some fields are empty", "Please fill in every field before saving. Nothing was saved.");
      return;
    }

    const invalidTimeSlot = timeSlots.some((slot) => {
      const { startTime, endTime } = splitTimeSlot(slot);
      return !startTime || !endTime || startTime >= endTime;
    });

    if (invalidTimeSlot) {
      toast.show("error", "Finish the time slots", "Every time slot needs both a start time and an end time before you can save.");
      return;
    }

    try {
      setIsSaving(true);
      const token = tokenFetcher ? await tokenFetcher() : null;

      const serviceIds = Array.from(new Set(selectedServiceIds)).sort(
        (a, b) => a - b
      );

      if (isCreateMode) {
        const createdNailist = await createNailist(
          trimmedName,
          trimmedPosition,
          trimmedSpecialty,
          trimmedBio,
          trimmedImage,
          token,
          clerkId
        );

        const updatedServiceIds = await updateNailistServices(
          createdNailist.id,
          serviceIds,
          token,
          clerkId
        );

        onNailistCreated?.({
          ...createdNailist,
          service_ids: updatedServiceIds,
        });

        resetCreateForm();
        toast.show("success", "Artist added", "They now appear on the Artists page. Assign services and set their schedule so clients can book them.");
        return;
      }

      if (!nailist) return;

      const updatedNailist = await updateNailist(
        nailist.id,
        trimmedName,
        trimmedPosition,
        trimmedSpecialty,
        trimmedBio,
        trimmedImage,
        token,
        clerkId
      );

      const updatedServiceIds = await updateNailistServices(
        nailist.id,
        serviceIds,
        token,
        clerkId
      );

      const updatedDayOffs = await updateNailistDayOffs(nailist.id, {
        regularDays: Array.from(new Set(regularDays)).sort((a, b) => a - b),
        customDates: Array.from(new Set(customDates)).sort(),
      },
      token,
      clerkId
    );

      const updatedTimeSlots = await updateNailistTimeSlots(
        nailist.id,
        Array.from(new Set(timeSlots)).sort(),
        token,
        clerkId
      );

      setName(updatedNailist.name);
      setPosition(updatedNailist.position);
      setSpecialty(updatedNailist.specialty);
      setBio(updatedNailist.bio);
      setImage(updatedNailist.image);

      setOriginalName(updatedNailist.name);
      setOriginalPosition(updatedNailist.position);
      setOriginalSpecialty(updatedNailist.specialty);
      setOriginalBio(updatedNailist.bio);
      setOriginalImage(updatedNailist.image);

      setSelectedServiceIds(updatedServiceIds);
      setOriginalSelectedServiceIds(updatedServiceIds);

      setRegularDays(updatedDayOffs.regularDays);
      setCustomDates(updatedDayOffs.customDates);
      setOriginalRegularDays(updatedDayOffs.regularDays);
      setOriginalCustomDates(updatedDayOffs.customDates);

      setTimeSlots(updatedTimeSlots);
      setOriginalTimeSlots(updatedTimeSlots);

      // The cached copies now match what was saved
      queryClient.setQueryData(artistServicesKey(nailist.id), updatedServiceIds);
      queryClient.setQueryData(bookingQueries.dayOffs(nailist.id).queryKey, updatedDayOffs);
      queryClient.setQueryData(bookingQueries.timeSlots(nailist.id).queryKey, updatedTimeSlots);

      setIsEditing(false);
      onNailistUpdated?.({
        ...updatedNailist,
        service_ids: updatedServiceIds,
      });
      toast.show("success", "Artist saved", "Your changes are now live on the website and in booking.");
    } catch (error) {
      console.error(
        `Failed to ${isCreateMode ? "create" : "save"} artist:`,
        error
      );

      toast.show(
        "error",
        isCreateMode ? "Artist not created" : "Artist not saved",
        error instanceof Error
          ? error.message
          : "We couldn't save this artist, so the website is unchanged. Your edits are still on screen. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!nailist) return;

    try {
      setIsDeleting(true);
      const token = tokenFetcher ? await tokenFetcher() : null;
      await deleteNailist(nailist.id, token, clerkId);
      setIsDeleteModalOpen(false);
      onNailistDeleted?.(nailist.id);
      toast.show("success", "Artist deleted", "They were removed from the Artists page and can no longer be booked.");
    } catch (error) {
      console.error("Failed to delete artist:", error);
      toast.show("error", "Artist not deleted", "We couldn't delete this artist, so they are still listed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const title = isCreateMode
    ? "Add Artist"
    : name.trim() || nailist?.name || originalName;

  return (
    <>
      <div className="flex flex-col w-full rounded-xl border border-crimson-light/50 bg-milk px-3 py-2.5">
        <Button
          variant="bare"
          type="button"
          onClick={() => setIsOpen((prevState) => !prevState)}
          aria-expanded={isOpen}
          className="flex items-center justify-between w-full gap-4 sm:gap-4 text-left min-h-[35px]"
        >
          <span className="block min-w-0 font-bold text-[15px] truncate text-gray-red">
            {title || "Untitled Artist"}
          </span>

          {isCreateMode ? (
            <PlusIcon
              size={20} className={`shrink-0 mr-0.75 transition-transform duration-300 ${
                isOpen ? "rotate-45" : ""
              }`}
            />
          ) : (
            <DropdownIcon
              size={22} className={`text-gray-red shrink-0 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </Button>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? "max-h-[2600px] opacity-100 mt-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-4">
            <InputField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isEditing={isEditing}
            />

            <div className="relative flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-gray-red/80">
                  Position
                </h3>
              </div>


              <Select className="w-full"
                  disabled={!isEditing}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="">Select position</option>

                  {POSITION_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
            </div>

            <InputField
              label="Specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              isEditing={isEditing}
            />

            <div className="flex flex-col gap-1.5">
              <CardTitle label="Services Offered" />

              {availableServices.length === 0 ? (
                <p className="text-[15px] text-gray-red">
                  No services available.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {availableServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-1 text-[14px] text-gray-red"
                    >
                      <span className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(service.id)}
                          disabled={!isEditing || isSaving || isDeleting}
                          onChange={() => toggleService(service.id)}
                          className="
                            peer
                            w-4 h-4 appearance-none rounded-[3px]
                            border border-crimson bg-transparent
                            checked:bg-crimson
                            disabled:cursor-not-allowed
                          "
                        />

                        <CheckIcon
                          size={18} className="pointer-events-none absolute hidden peer-checked:block text-light-orange"
                        />
                      </span>

                      {service.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <InputField
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              isEditing={isEditing}
            />

            <div className="flex flex-col gap-1.5">
              <CardTitle label="Photo" />

              {image && (
                <div className="flex items-center justify-between w-full min-h-[36px] bg-milk rounded-md px-4 py-1 mt-4 mb-1 overflow-visible border border-crimson-light">
                  <Button
                    variant="bare"
                    type="button"
                    onClick={() => setPreviewImageUrl(image)}
                    className="min-w-0 flex-1 cursor-pointer text-left text-[13px] leading-none truncate text-gray-red hover:underline"
                  >
                    {image.split("/").pop()}
                  </Button>

                  {isEditing && (
                    <Button
                      variant="bare"
                      type="button"
                      onClick={() => setImage("")}
                      disabled={isUploading}
                      className="flex items-center justify-center w-7 h-7 shrink-0"
                    >
                      <XIcon size={28} className="text-crimson" />
                    </Button>
                  )}
                </div>
              )}

              {isEditing && !image && (
                <label
                  className={`flex flex-col items-center justify-center w-full mt-4 ${
                    !isUploading ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-center w-10.5 h-10.5 rounded-sm bg-crimson/15 text-gray-red">
                    <UploadIcon size={28} className="text-crimson" />
                  </div>

                  <p className="text-[13px] text-gray-red">
                    {isUploading
                      ? "Uploading photo..."
                      : "Click here to upload a photo"}
                  </p>

                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    disabled={isUploading}
                    className="border border-crimson-light focus:border-crimson hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        setIsUploading(true);
                        const currentName = name;
                        const token = tokenFetcher ? await tokenFetcher() : null;

                        const data = await uploadImage(file, "nailists", token, clerkId);

                        setImage(data.imageUrl);
                        setName((prevName) => prevName || currentName || nailist?.name || originalName);
                      } catch (error) {
                        console.error("Failed to upload image:", error);
                        toast.show("error", "Photo not uploaded", "We couldn't upload that photo. Please check that it is an image file and try again.");
                      } finally {
                        setIsUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {!isCreateMode && (
              <DayOffCard
                nailistId={nailist?.id}
                disabled={!isEditing || isSaving || isDeleting}
                regularDays={regularDays}
                customDates={customDates}
                setRegularDays={setRegularDays}
                setCustomDates={setCustomDates}
                onDayOffsLoaded={handleDayOffsLoaded}
              />
            )}

            {!isCreateMode && (
              <TimeSlotCard
                nailistId={nailist?.id}
                disabled={!isEditing || isSaving || isDeleting}
                timeSlots={timeSlots}
                setTimeSlots={setTimeSlots}
                onTimeSlotsLoaded={handleTimeSlotsLoaded}
              />
            )}

            <NailArtistGallery
              nailistId={isCreateMode ? null : (nailist?.id ?? null)}
              isEditing={isEditing}
              tokenFetcher={tokenFetcher}
              clerkId={clerkId}
              onPreview={setPreviewImageUrl}
              onChanged={onGalleryChanged}
            />

            <EditActions
              isEditing={isEditing}
              isCreateMode={isCreateMode}
              isSaving={isSaving}
              busy={isUploading}
              onEdit={() => setIsEditing(true)}
              onCancel={handleCancel}
              onSave={handleSave}
              onDelete={() => setIsDeleteModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {!isCreateMode && (
        <ConfirmModal
          open={isDeleteModalOpen}
          title="Delete artist?"
          confirmLabel="Delete artist"
          loadingLabel="Deleting..."
          loading={isDeleting}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        >
          Are you sure you want to delete this artist? This action cannot be undone.
        </ConfirmModal>
      )}

      <ImagePreviewModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>
  );
};

export default NailArtistDropdown;