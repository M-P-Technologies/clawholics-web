import { ArrowLeft as BackButtonIcon, Check as CheckIcon, ChevronDown as DropdownIcon, Plus as PlusIcon, Upload as UploadIcon, X as XIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { fetchAppointments } from "../../services/appointmentService";

import AS_ImagePreviewModal from "./AS_ImagePreviewModal";
import AS_NailArtistGallery from "./AS_NailArtistGallery";

import {
  createNailist,
  deleteNailist,
  fetchNailistDayOffs,
  fetchNailistServices,
  fetchNailistTimeSlots,
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

type AS_NailArtistDropdownProps = {
  nailist?: Nailist;
  mode?: "edit" | "create";
  onNailistUpdated?: (updatedNailist: Nailist) => void;
  onNailistCreated?: (createdNailist: Nailist) => void;
  onNailistDeleted?: (nailistId: number) => void;
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[17px] tracking-wide text-gray-red">{label}</h3>
      </div>

      <div className="w-full h-[1.5px] bg-crimson mb-4" />
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
    <div className="bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[17px] tracking-wide text-gray-red">{label}</h3>
      </div>

      <div className="w-full h-[1.5px] bg-crimson mb-2" />

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
        className="w-full min-h-[32px] mt-1 bg-transparent outline-none resize-none overflow-hidden text-[16px] text-gray-red whitespace-pre-line disabled:cursor-not-allowed"
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
        const appointments = await fetchAppointments();

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

  return (
    <div className="bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
      <CardTitle label="Day Off" />

      {isLoading ? (
        <p className="text-[15px] text-gray-red">Loading day offs...</p>
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

          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="bg-light-orange rounded-sm px-2 py-2 sm:px-4 sm:py-4 w-full lg:w-fit flex justify-center overflow-x-auto border border-crimson-light/80">
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
                className="day-off-picker text-gray-red w-full lg:w-fit"
                classNames={{
                  root: "relative w-full lg:w-fit",
                  month: "w-full lg:w-fit",
                  month_caption:
                    "flex items-center justify-center h-8 text-[13px] lg:text-[14px] font-bold uppercase tracking-wide text-gray-red",
                  caption_label: "text-[13px] lg:text-[14px] font-bold uppercase",
                  nav: "absolute left-0 right-0 top-0 flex items-center justify-between",
                  button_previous:
                    "w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center",
                  button_next:
                    "w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center",
                  chevron: "w-4 h-4 fill-crimson text-gray-red",
                  month_grid:
                    "w-full lg:w-fit table-fixed lg:table-auto border-separate border-spacing-1 lg:border-spacing-2.5",
                  weekday:
                    "text-center text-[11px] lg:text-[14px] font-bold text-gray-red pb-1",
                  day: "p-0 text-center lg:h-7 lg:w-7",
                  day_button:
                    "w-full aspect-square lg:h-9 lg:w-9 rounded-sm text-[14px] lg:text-[14px] font-bold text-gray-red transition-colors disabled:cursor-not-allowed",
                  outside: "opacity-0 pointer-events-none",
                }}
                components={{
                  Chevron: ({ orientation }) => (
                    <BackButtonIcon
                      size={24} className={`text-gray-red lg:w-7 lg:h-7 ${
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

            <div className="flex flex-wrap lg:flex-col gap-x-4 gap-y-2 lg:gap-4">
              <div className="flex items-center gap-2">
                <span className="block w-5 h-5 lg:w-6 lg:h-6 rounded-sm bg-success/50" />
                <span className="text-[13px] lg:text-[15px] text-gray-red">
                  Available
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="block w-5 h-5 lg:w-6 lg:h-6 rounded-sm bg-danger/40" />
                <span className="text-[13px] lg:text-[15px] text-gray-red">
                  Booked
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="block w-5 h-5 lg:w-6 lg:h-6 rounded-sm bg-gray-red/40" />
                <span className="text-[13px] lg:text-[15px] text-gray-red">
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
  const [isLoading, setIsLoading] = useState(false);
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  useEffect(() => {
    if (!nailistId) return;

    const loadTimeSlots = async () => {
      try {
        setIsLoading(true);
        const data = await fetchNailistTimeSlots(nailistId);
        onTimeSlotsLoaded(data);
      } catch (error) {
        console.error("Failed to fetch time slots:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeSlots();
  }, [nailistId]);

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
      <div className="w-full h-[35px] bg-light-orange rounded-md px-4 flex items-center text-[16px] text-gray-red leading-none cursor-not-allowed border border-crimson-light/80">
        {displayValue}
      </div>
    ) : (
      <div
        className="relative w-full h-[35px] bg-light-orange rounded-md px-4 flex items-center cursor-pointer border border-crimson-light/80"
        onClick={(e) => openTimePicker(e.currentTarget)}
      >
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-[16px] text-gray-red outline-none cursor-pointer appearance-none p-0 m-0 leading-none [&::-webkit-calendar-picker-indicator]:hidden"
        />
      </div>
    );
  };

  return (
    <div className="bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
      <CardTitle label="Time Slots" />

      {isLoading ? (
        <p className="text-[15px] text-gray-red">Loading time slots...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className={`grid gap-4 items-center ${
              disabled
                ? "grid-cols-[1fr_1fr]"
                : "grid-cols-[1fr_1fr_20px]"
            }`}
          >
            <p className="text-[16px] font-bold text-center text-gray-red">
              Start Time
            </p>

            <p className="text-[16px] font-bold text-center text-gray-red">
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

const AS_NailArtistDropdown: React.FC<AS_NailArtistDropdownProps> = ({
  nailist,
  mode = "edit",
  onNailistUpdated,
  onNailistCreated,
  onNailistDeleted,
  tokenFetcher,
  clerkId,
}) => {
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

  const [availableServices, setAvailableServices] = useState<NailService[]>([]);
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
    const loadServices = async () => {
      try {
        const services = await fetchServices();
        setAvailableServices(services);
      } catch (error) {
        console.error("Failed to fetch services:", error);
      }
    };

    loadServices();
  }, []);

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

  useEffect(() => {
    if (!isCreateMode && nailist) {
      const loadNailistServices = async () => {
        try {
          const serviceIds = await fetchNailistServices(nailist.id);
          setSelectedServiceIds(serviceIds);
          setOriginalSelectedServiceIds(serviceIds);
        } catch (error) {
          console.error("Failed to fetch artist services:", error);
        }
      };

      loadNailistServices();
    }
  }, [nailist, isCreateMode]);

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
      <div className="flex flex-col w-full rounded-sm sm:rounded-sm px-4 sm:px-4 py-2 shadow-sm bg-light-orange/40">
        <Button
          variant="bare"
          type="button"
          onClick={() => setIsOpen((prevState) => !prevState)}
          className="flex items-center justify-between w-full gap-4 sm:gap-4 text-left min-h-[35px]"
        >
          <p className="font-bold text-[17px] truncate text-gray-red">
            {title || "Untitled Artist"}
          </p>

          {isCreateMode ? (
            <PlusIcon
              size={26} className={`shrink-0 mr-0.75 transition-transform duration-300 ${
                isOpen ? "rotate-45" : ""
              }`}
            />
          ) : (
            <DropdownIcon
              size={32} className={`text-gray-red shrink-0 transition-transform duration-300 ${
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

            <div className="bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2 relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[17px] tracking-wide text-gray-red">
                  Position
                </h3>
              </div>

              <div className="w-full h-[1.5px] bg-crimson mb-1" />

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

            <div className="bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
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

            <div className="bg-light-orange rounded-sm sm:rounded-sm px-4 sm:px-4 py-2">
              <CardTitle label="Photo" />

              {image && (
                <div className="flex items-center justify-between w-full min-h-[36px] bg-light-orange rounded-md px-4 py-1 mt-4 mb-1 overflow-visible border border-crimson-light/80">
                  <Button
                    variant="bare"
                    type="button"
                    onClick={() => setPreviewImageUrl(image)}
                    className="min-w-0 flex-1 cursor-pointer text-left text-[16px] leading-none truncate text-gray-red hover:underline"
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

            <AS_NailArtistGallery
              nailistId={isCreateMode ? null : (nailist?.id ?? null)}
              isEditing={isEditing}
              tokenFetcher={tokenFetcher}
              clerkId={clerkId}
              onPreview={setPreviewImageUrl}
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

      <AS_ImagePreviewModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </>
  );
};

export default AS_NailArtistDropdown;