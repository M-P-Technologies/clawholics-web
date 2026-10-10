"use client";

import { useAuth,useUser } from "@clerk/nextjs";
import { ArrowLeft as BackButton,X as XIcon } from "lucide-react";
import { useEffect,useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import AS_AppointmentDetailsModal from "../components/admin/AS_AppointmentDetailsModal";
import AS_SideBar from "../components/admin/AS_SideBar";
import {
updateAppointmentStatus,
type Appointment,
type AppointmentStatus,
} from "../services/appointmentService";
import {
fetchMonthlySchedule,
type MonthlySchedule,
type NailArtist,
type ScheduleAppointment,
} from "../services/scheduleService";

import Button from "../components/ui/Button";
import { LoadingBar } from "../components/ui/LoadingBar";
import Select from "../components/ui/Select";
import { useToast } from "../components/ui/ToastProvider";

interface ArtistSchedule {
  id: number;
  name: string;
  appointments: ScheduleAppointment[];
  isDayOff: boolean;
  slotCount: number;
  timeSlots: string[];
  unavailableSlotCount: number;
}

const formatScheduleDate = (dateString: string) => {
  const [year, monthValue, day] = dateString.split("-").map(Number);

  if (!year || !monthValue || !day) {
    return dateString;
  }

  const parsedDate = new Date(year, monthValue - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  const weekday = parsedDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const fullDate = parsedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${weekday} | ${fullDate}`;
};

const getScheduleClientName = (appointment: ScheduleAppointment) => {
  return (
    appointment.client_name ||
    `${appointment.first_name ?? ""} ${appointment.last_name ?? ""}`.trim() ||
    `User #${appointment.user_id ?? ""}`
  );
};

const getArtistStatus = (artist: ArtistSchedule) => {
  if (artist.isDayOff) return "Day Off";

  if (
    artist.slotCount > 0 &&
    artist.appointments.length >= artist.slotCount
  ) {
    return "Fully Booked";
  }

  return "Available";
};

const getStatusPillClass = (artist: ArtistSchedule) => {
  const status = getArtistStatus(artist);

  if (status === "Fully Booked") {
    return "bg-danger/20 text-danger";
  }

  if (status === "Available") {
    return "bg-success/20 text-success";
  }

  return "bg-gray-red/20 text-gray-red/70";
};

const getDayDotColor = (artist: ArtistSchedule) => {
  if (artist.isDayOff) return "bg-gray-red/50";
  if (artist.slotCount > 0 && artist.appointments.length >= artist.slotCount) return "bg-danger";
  return "bg-success";
};

const today = new Date();
today.setHours(0, 0, 0, 0);

export default function AS_Schedule() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [month, setMonth] = useState(new Date());

  const [scheduleData, setScheduleData] =
    useState<MonthlySchedule | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [selectedAppointment, setSelectedAppointment] =
    useState<ScheduleAppointment | null>(null);

  const [filterBy, setFilterBy] = useState("All");

  const [isLoading, setIsLoading] = useState(true);

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const monthValue = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${monthValue}-${day}`;
  };

  const parseLocalDate = (dateString: string) => {
    const parts = dateString.split("-").map(Number);

    if (parts.length !== 3) {
      return null;
    }

    const [year, monthValue, day] = parts;

    if (!year || !monthValue || !day) {
      return null;
    }

    const parsedDate = new Date(year, monthValue - 1, day);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  };

  const formatLocalMonth = (date: Date) => {
    const year = date.getFullYear();
    const monthValue = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${monthValue}`;
  };

  const getDayPickerDate = (props: any) => {
    const possibleDate =
      props?.day?.date instanceof Date
        ? props.day.date
        : props?.date instanceof Date
          ? props.date
          : null;

    if (!possibleDate || Number.isNaN(possibleDate.getTime())) {
      return null;
    }

    return new Date(
      possibleDate.getFullYear(),
      possibleDate.getMonth(),
      possibleDate.getDate(),
    );
  };

  const loadSchedule = async () => {
    try {
      setIsLoading(true);

      const token = await getToken();
      const selectedMonth = formatLocalMonth(month);
      const data = await fetchMonthlySchedule(selectedMonth, token, currentUser?.id);

      setScheduleData(data);
    } catch (error) {
      console.error(error);
      toast.show("error", "Couldn't load the schedule", "We couldn't load the schedule, so the calendar may look empty. Please refresh the page to try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [month, currentUser?.id]);

  const refreshSchedule = async () => {
    const token = await getToken();
    const selectedMonth = formatLocalMonth(month);

    const updatedSchedule = await fetchMonthlySchedule(selectedMonth, token, currentUser?.id);

    setScheduleData(updatedSchedule);
  };

  const goToPreviousMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  const monthLabel = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const getArtistName = (artist: NailArtist) => {
    return (
      artist.name ||
      `${artist.first_name ?? ""} ${artist.last_name ?? ""}`.trim() ||
      "Artist"
    );
  };

  const parseTimeRange = (range: string) => {
    const [start, end] = range.split("-");
  
    const toNumber = (time: string) => {
      const [hour, minute] = time.split(":").map(Number);
      return hour * 60 + minute;
    };
  
    return {
      start: toNumber(start),
      end: toNumber(end),
    };
  };
  
  const isOverlapping = (slotA: string, slotB: string) => {
    const rangeA = parseTimeRange(slotA);
    const rangeB = parseTimeRange(slotB);
  
    return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
  };
  
  const isPastTimeForDate = (slot: string, dateStr: string) => {
    const selectedDate = parseLocalDate(dateStr);
    if (!selectedDate) return false;
  
    const today = new Date();
  
    if (selectedDate.toDateString() !== today.toDateString()) {
      return false;
    }
  
    const now = today.getHours() * 60 + today.getMinutes();
    const [start] = slot.split("-");
    const [hour, minute] = start.split(":").map(Number);
  
    return hour * 60 + minute <= now;
  };

  const closeScheduleDetails = () => {
    setSelectedDate(null);
    setSelectedAppointment(null);
  };

  const buildDayData = (date: Date): ArtistSchedule[] => {
    if (!scheduleData) return [];

    const dateStr = formatLocalDate(date);

    const dayOfWeek = date.getDay();

    return scheduleData.nailists
      .filter((artist) => {
        const name = getArtistName(artist);

        return filterBy === "All" ? true : name === filterBy;
      })
      .map((artist) => {
        const appointments = scheduleData.appointments.filter(
          (appointment) =>
            Number(appointment.nailist_id) === Number(artist.id) &&
            appointment.appointment_date === dateStr,
        );

        const hasCustomDayOff = scheduleData.dayOffs.some(
          (dayOff) =>
            Number(dayOff.nailist_id) === Number(artist.id) &&
            dayOff.day_off_type === "CUSTOM" &&
            dayOff.date === dateStr,
        );

        const hasRegularDayOff = scheduleData.dayOffs.some(
          (dayOff) =>
            Number(dayOff.nailist_id) === Number(artist.id) &&
            dayOff.day_off_type === "REGULAR" &&
            Number(dayOff.day_of_week) === dayOfWeek,
        );

        const artistTimeSlots =
          scheduleData.timeSlots
            ?.filter((slot) => Number(slot.nailist_id) === Number(artist.id))
            .map((slot) => `${slot.start_time}-${slot.end_time}`) ?? [];

        const slotCount = artistTimeSlots.length;

        const unavailableSlotCount = artistTimeSlots.filter((slot) => {
          const isBooked = appointments.some((appointment) =>
            appointment.appointment_time
              ? isOverlapping(appointment.appointment_time, slot)
              : false
          );

          const isPast = isPastTimeForDate(slot, dateStr);

          return isBooked || isPast;
        }).length;

        return {
          id: artist.id,
          name: getArtistName(artist),
          appointments,
          isDayOff: hasCustomDayOff || hasRegularDayOff,
          slotCount,
          timeSlots: artistTimeSlots,
          unavailableSlotCount,
        };
      });
  };

  const handleDateClick = (dateKey: string) => {
    const parsedDate = parseLocalDate(dateKey);

    if (!parsedDate) {
      console.error("Invalid selected date:", dateKey);
      return;
    }

    setSelectedDate(dateKey);
  };

  const handleAppointmentStatusChange = async (
    id: number,
    status: AppointmentStatus,
  ) => {
    const token = await getToken();
    const updatedAppointment = await updateAppointmentStatus(id, status, token, currentUser?.id);

    setSelectedAppointment(updatedAppointment as ScheduleAppointment);

    await refreshSchedule();
  };

  const selectedDateObject = selectedDate
    ? parseLocalDate(selectedDate)
    : null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading the schedule" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen lg:h-screen bg-light-orange px-2 py-2 sm:px-4 sm:py-4 overflow-x-hidden">
      <AS_SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-16 lg:pt-0">
        <header className="flex flex-col gap-4 w-full">
          <h3 className="text-sm text-gray-red/80">
            Welcome, Admin!
          </h3>

          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-display text-2xl font-normal uppercase leading-tight tracking-widest text-gray-red sm:text-3xl">
              Schedule
            </h3>

            <div className="flex h-5 items-center gap-2">
              <label className="flex h-5 items-center text-[14px] text-gray-red">
                Filter by
              </label>

              <Select className="w-40"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                >
                  <option value="All">All Artists</option>

                  {scheduleData?.nailists?.map((artist) => {
                    const name = getArtistName(artist);

                    if (!name) return null;

                    return (
                      <option key={artist.id} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </Select>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-light-orange rounded-sm lg:rounded-sm p-4 lg:p-4 overflow-y-auto flex flex-col border border-crimson-light/80">
          <div className="mb-2 flex items-center justify-between">
            <Button
              variant="bare"
              type="button"
              onClick={goToPreviousMonth}
              className="flex h-8 w-8 items-center justify-center"
            >
              <BackButton size={32} className="text-gray-red" />
            </Button>

            <h3 className="text-[16px] lg:text-[18px] uppercase">
              {monthLabel}
            </h3>

            <Button
              variant="bare"
              type="button"
              onClick={goToNextMonth}
              className="flex h-8 w-8 items-center justify-center"
            >
              <BackButton size={32} className="text-gray-red rotate-180" />
            </Button>
          </div>

          <DayPicker
            month={month}
            onMonthChange={setMonth}
            showOutsideDays={false}
            formatters={{
              formatWeekdayName: (date) =>
                date.toLocaleDateString("en-US", {
                  weekday: "short",
                }),
            }}
            classNames={{
              root: "flex-1 flex flex-col min-w-0",
              months: "flex-1 flex flex-col min-w-0",
              month: "flex-1 flex flex-col min-w-0",
              month_caption: "hidden",
              caption_label: "hidden",
              nav: "hidden",

              weekdays:
                "grid grid-cols-7 gap-1 lg:gap-4 mb-2 text-center text-gray-red font-bold text-[11px] sm:text-[13px] lg:text-[16px]",

              weekday: "py-1",

              weeks: "grid grid-rows-6 gap-1 lg:gap-4 lg:flex-1",

              week: "grid grid-cols-7 gap-1 lg:gap-4",

              day: "h-[52px] sm:h-[68px] lg:min-h-[105px] lg:h-full w-full",

              day_button: "h-full w-full p-0",

              outside: "invisible",
              today: "",
              selected: "",
            }}
            components={{
              Day: (props: any) => {
                const validDate = getDayPickerDate(props);

                if (
                  !validDate ||
                  validDate.getMonth() !== month.getMonth()
                ) {
                  return <div className="h-full w-full" />;
                }

                const dateKey = formatLocalDate(validDate);

                const dayData = buildDayData(validDate);
                const cellDate = new Date(validDate);
                cellDate.setHours(0, 0, 0, 0);
                const isPastDay = cellDate < today;

                return (
<Button
            variant="bare"
            type="button"
            onClick={() => handleDateClick(dateKey)}
            className={`flex h-full min-h-0 lg:min-h-[105px] w-full flex-col rounded-sm bg-light-orange/40 px-1 py-1 lg:px-2 lg:py-2 text-left transition ${
              isPastDay
                ? "opacity-40"
                : "hover:scale-[1.02] hover:shadow"
            }`}
          >
            <p className="mb-1 lg:mb-2 text-[13px] lg:text-[16px] font-semibold leading-none text-gray-red">
              {validDate.getDate()}
            </p>

            <div className="flex w-full flex-col gap-0.5 lg:gap-1 overflow-hidden">
              {dayData.slice(0, 3).map((artist) => {
                return (
                  <div
                    key={artist.id}
                    className="flex w-full items-center gap-1 rounded-sm bg-light-orange px-1 lg:px-2 py-0.5"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${getDayDotColor(artist)}`}
                    />
                    <span className="truncate text-[9px] sm:text-[10px] lg:text-[11px] leading-tight text-gray-red">
                      {artist.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </Button>
                );
              },
            }}
          />
        </div>
      </div>

      {selectedDate && selectedDateObject && (
<div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-gray-red/40 px-4 py-4 lg:px-12 lg:py-8 drawer-backdrop max-sm:p-0"
          onClick={closeScheduleDetails}
        >
          <div
            className="max-h-[calc(100vh-32px)] w-full lg:h-full lg:w-[430px] rounded-sm bg-light-orange p-4 lg:p-4 shadow-xl drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 lg:mb-8 flex items-start justify-between gap-4">
              <h3 className="max-w-[calc(100%-40px)] lg:max-w-[330px] text-[19px] lg:text-[22px] font-bold leading-tight text-gray-red">
                {formatScheduleDate(selectedDate)}
              </h3>

              <Button
                variant="bare"
                type="button"
                onClick={closeScheduleDetails}
                className="flex h-7 w-7 items-center justify-center shrink-0"
              >
                <XIcon size={36} className="text-crimson" />
              </Button>
            </div>

            <div className="max-h-[calc(100vh-120px)] lg:max-h-[calc(100%-60px)] overflow-y-auto">
              {buildDayData(selectedDateObject).map((artist) => (
                <div key={artist.id} className="mb-4">
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <h3 className="text-[17px] lg:text-[19px] font-bold text-gray-red">
                      {artist.name}
                    </h3>

                    <span
                      className={`shrink-0 rounded-md px-4 py-1 text-[10px] lg:text-[11px] font-semibold uppercase ${getStatusPillClass(
                        artist
                      )}`}
                    >
                      {getArtistStatus(artist)}
                    </span>
                  </div>

                  {artist.isDayOff ? null : artist.appointments.length === 0 ? (
                    <p className="text-[14px] text-gray-red/70">
                      No appointments for this date.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {artist.appointments.map((appointment, index) => (
                        <Button
                          variant="bare"
                          key={appointment.id ?? index}
                          type="button"
                          onClick={() => setSelectedAppointment(appointment)}
                          className="flex min-h-[50px] w-full items-center justify-between rounded-sm bg-light-orange px-4 py-2 text-left transition border border-crimson-light/80"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[15px] lg:text-[16px] font-bold uppercase leading-tight text-gray-red">
                                {getScheduleClientName(appointment)}
                              </p>

                              <span className="rounded-md border-[0.8px] px-2 py-0.5 text-[11px] font-bold text-gray-red">
                                ID #{appointment.id}
                              </span>
                            </div>

                            <p className="text-[13px] lg:text-[14px] leading-tight text-gray-red">
                              {appointment.service_name || "No service"}{" "}
                              <span className="mx-1">•</span>
                              {appointment.appointment_date || selectedDate} |{" "}
                              {appointment.appointment_time || "No time"}
                            </p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <AS_AppointmentDetailsModal
          appointment={selectedAppointment as Appointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={handleAppointmentStatusChange}
        />
      )}
    </div>
  );
}