import { X as CloseIconLucide,Plus as PlusIcon } from "lucide-react";
import { useEffect,useMemo,useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";


import { API_BASE_URL } from "../../apiConfig";
import {
createAdminAppointment,
fetchBookedSlotsDetailed,
fetchNailists,
type AdminAppointmentPayload,
} from "../../services/bookingService";

import {
fetchNailistDayOffs,
fetchNailistTimeSlots,
} from "../../services/nailistService";
import Button from "../ui/Button";
import Select from "../ui/Select";

interface CreateAppointmentModalProps {
  onClose: () => void;
  onCreated: () => void;
}

interface Service {
  id: number;
  name: string;
  category?: string;
  description?: string;
  master_price: number;
  junior_price: number;
  duration: string;
}

interface NailArtist {
  id: number;
  name: string;
  category_id?: number;
}

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

const AS_CreateAppointmentModal = ({
  onClose,
  onCreated,
}: CreateAppointmentModalProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [nailists, setNailists] = useState<NailArtist[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dayOffs, setDayOffs] = useState<number[]>([]);
  const [customOffs, setCustomOffs] = useState<string[]>([]);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);

  const [serviceId, setServiceId] = useState("");
  const [nailistId, setNailistId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [month, setMonth] = useState(new Date());

  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingNailists, setLoadingNailists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
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

  const inputClass =
    "h-9 w-full rounded-md border-none bg-light-orange px-4 text-[13px] text-gray-red placeholder:text-gray-red/60 outline-none focus:ring-2 focus:ring-crimson";

  const toLocalDate = (dateStr: string) => {
    const [year, monthNumber, day] = dateStr.split("-").map(Number);
    return new Date(year, monthNumber - 1, day);
  };

  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${monthNumber}-${day}`;
  };

  const isOverlapping = (slotA: string, slotB: string) => {
    const rangeA = parseTimeRange(slotA);
    const rangeB = parseTimeRange(slotB);

    return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
  };

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

  const formatSlot = (slot: string) => {
    const [start, end] = slot.split("-");

    if (!start || !end) return slot;

    const format = (time: string) => {
      const [hour24, minute] = time.split(":").map(Number);
      const ampm = hour24 >= 12 ? "PM" : "AM";
      const hour = hour24 % 12 || 12;

      return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
    };

    return `${format(start)} - ${format(end)}`;
  };

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
  }, [selectedNailist]);

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
  }, [selectedNailist, appointmentDate]);

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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-gray-red/40 px-4 py-4 sm:items-end sm:items-center sm:px-4 drawer-backdrop max-sm:p-0"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-[700px] rounded-sm bg-light-orange px-4 py-4 shadow-lg sm:rounded-sm sm:px-4 sm:py-4 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-[20px] font-bold uppercase leading-tight text-gray-red sm:text-[24px]">
            Create Appointment
          </h3>

          <Button variant="bare" type="button" onClick={onClose} className="shrink-0">
            <CloseIconLucide size={28} className="sm:h-[30px] sm:w-[30px] text-crimson" aria-hidden="true" />
          </Button>
        </div>

        {message && (
          <div className="mb-4 rounded-sm bg-light-orange px-4 py-4 text-center text-[13px] font-medium text-gray-red border border-crimson-light/80">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.50fr_0.50fr] lg:gap-4">
          {/* LEFT SIDE */}
          <div className="flex flex-col gap-4">
            {/* CLIENT INFORMATION */}
            <section className="rounded-sm bg-light-orange px-4 py-4 sm:rounded-sm sm:px-4 border border-crimson-light/80 flex flex-col gap-1">
              <h4 className="text-[14px] font-bold uppercase text-gray-red sm:text-[15px]">
                Client Information
              </h4>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className={inputClass}
                  />

                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className={inputClass}
                  />
                </div>

                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (/^\d{0,11}$/.test(value)) {
                      setPhone(value);
                    }
                  }}
                  placeholder="Phone number"
                  className={inputClass}
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address (optional)"
                  className={inputClass}
                />
              </div>
            </section>

            {/* APPOINTMENT DETAILS */}
            <section className="rounded-sm bg-light-orange px-4 py-4 sm:rounded-sm sm:px-4 border border-crimson-light/80 flex flex-col gap-1">
              <h4 className="text-[14px] font-bold uppercase text-gray-red sm:text-[15px]">
                Appointment Details
              </h4>

              <div className="flex flex-col gap-4">
                <Select
                    value={nailistId}
                    onChange={(e) => {
                      setNailistId(e.target.value);
                      setServiceId("");
                    }}
                    disabled={loadingNailists}
                  >
                    <option value="">
                      {loadingNailists
                        ? "Loading nail artists..."
                        : "Select nail artist"}
                    </option>

                    {nailists.map((nailist) => (
                      <option key={nailist.id} value={nailist.id}>
                        {nailist.name}
                      </option>
                    ))}
                  </Select>

                <Select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    disabled={loadingServices}
                  >
                    <option value="">
                      {loadingServices ? "Loading services..." : "Select service"}
                    </option>

                    {artistServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
              </div>
            </section>

            {/* DATE AND TIME - MOBILE POSITION */}
            <section className="rounded-sm bg-light-orange px-4 py-4 sm:rounded-sm sm:px-4 lg:hidden border border-crimson-light/80">
              <DateAndTimeContent
                selectedNailist={selectedNailist}
                loadingSlots={loadingSlots}
                appointmentDate={appointmentDate}
                appointmentTime={appointmentTime}
                month={month}
                timeSlots={timeSlots}
                fullyBookedDates={fullyBookedDates}
                setMonth={setMonth}
                setAppointmentTime={setAppointmentTime}
                handleDateSelect={handleDateSelect}
                isDisabledDate={isDisabledDate}
                toLocalDate={toLocalDate}
                toLocalDateString={toLocalDateString}
                isTimeBlocked={isTimeBlocked}
                formatSlot={formatSlot}
              />
            </section>

            {/* BOOKING SUMMARY */}
            <section className="rounded-sm bg-light-orange px-4 py-4 text-gray-red shadow-sm sm:rounded-sm border border-crimson-light/80">
              <SummaryContent
                selectedService={selectedService}
                selectedNailist={selectedNailist}
                appointmentDate={appointmentDate}
                appointmentTime={appointmentTime}
                selectedPrice={selectedPrice}
                formatSlot={formatSlot}
              />
            </section>
          </div>

          {/* RIGHT SIDE DESKTOP */}
          <div className="hidden flex-col gap-4 lg:flex">
            {/* DATE AND TIME */}
            <section className="rounded-sm bg-light-orange px-4 py-4 lg:py-4 border border-crimson-light/80">
              <DateAndTimeContent
                selectedNailist={selectedNailist}
                loadingSlots={loadingSlots}
                appointmentDate={appointmentDate}
                appointmentTime={appointmentTime}
                month={month}
                timeSlots={timeSlots}
                fullyBookedDates={fullyBookedDates}
                setMonth={setMonth}
                setAppointmentTime={setAppointmentTime}
                handleDateSelect={handleDateSelect}
                isDisabledDate={isDisabledDate}
                toLocalDate={toLocalDate}
                toLocalDateString={toLocalDateString}
                isTimeBlocked={isTimeBlocked}
                formatSlot={formatSlot}
              />
            </section>

          </div>
        </div>

        {/* ACTIONS */}
        <div className="mt-4 flex flex-row items-center justify-center gap-4 sm:justify-end lg:justify-center">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-[100px] lg:text-[14px]"
            >
            Cancel
          </Button>

          <Button
            variant="bare"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex w-[230px] items-center justify-center gap-2 rounded-md bg-crimson px-4 py-2 transition hover:opacity-90 disabled:opacity-60"
          >
            <PlusIcon size={14} className="text-light-orange" />

            <span className="text-[14px] font-semibold text-light-orange uppercase">
              {submitting ? "Creating..." : "Create Appointment"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

function DateAndTimeContent({
  selectedNailist,
  loadingSlots,
  appointmentDate,
  appointmentTime,
  month,
  timeSlots,
  fullyBookedDates,
  setMonth,
  setAppointmentTime,
  handleDateSelect,
  isDisabledDate,
  toLocalDate,
  toLocalDateString,
  isTimeBlocked,
  formatSlot,
}: {
  selectedNailist: NailArtist | undefined;
  loadingSlots: boolean;
  appointmentDate: string;
  appointmentTime: string;
  month: Date;
  timeSlots: string[];
  fullyBookedDates: string[];
  setMonth: (date: Date) => void;
  setAppointmentTime: (time: string) => void;
  handleDateSelect: (date: Date | undefined) => void;
  isDisabledDate: (date: Date) => boolean;
  toLocalDate: (dateStr: string) => Date;
  toLocalDateString: (date: Date) => string;
  isTimeBlocked: (slot: string) => boolean;
  formatSlot: (slot: string) => string;
}) {
  return (
    <>
      <h4 className="mb-1 text-[14px] font-bold uppercase text-gray-red sm:text-[15px]">
        Pick Date & Time
      </h4>

      {loadingSlots ? (
        <div className="rounded-sm bg-light-orange px-4 py-8 text-center text-[13px] font-medium text-gray-red">
          Loading availability...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* CALENDAR */}
          <div className="flex justify-center rounded-sm bg-light-orange px-2 py-1">
            <DayPicker
              mode="single"
              required
              month={month}
              onMonthChange={setMonth}
              selected={appointmentDate ? toLocalDate(appointmentDate) : undefined}
              onSelect={handleDateSelect}
              disabled={(date) => isDisabledDate(date)}
              modifiers={{
                fullyBooked: (date) => {
                  const formatted = toLocalDateString(date);
                  return fullyBookedDates.includes(formatted);
                },
              }}
              modifiersClassNames={{
                fullyBooked: "[&>button]:text-gray-red",
              }}
              classNames={{
                root: "relative w-fit max-w-full",
                month: "w-full",
                month_caption:
                  "flex h-7 items-center justify-center text-[12px] font-bold uppercase tracking-wide text-gray-red sm:text-[13px]",
                caption_label: "text-[13px] font-bold uppercase sm:text-[14px]",
                nav: "absolute left-0 right-0 top-0 flex items-center justify-between",
                button_previous:
                  "flex h-7 w-7 items-center justify-center transition hover:scale-110 aria-disabled:cursor-not-allowed aria-disabled:opacity-20",
                button_next:
                  "flex h-7 w-7 items-center justify-center transition hover:scale-110 aria-disabled:cursor-not-allowed aria-disabled:opacity-20",
                chevron: "h-3.5 w-3.5 fill-crimson text-gray-red",
                month_grid:
                  "w-full border-separate border-spacing-1 sm:border-spacing-1.5",
                weekday:
                  "pb-1 text-center text-[12px] font-bold text-gray-red sm:text-[13px]",
                  day: "h-7 w-7 p-0 text-center sm:h-8 sm:w-8",
                  day_button:
                    "h-7 w-7 rounded-sm bg-crimson/30 text-[12px] font-bold transition-all duration-200 hover:bg-crimson hover:text-light-orange focus:bg-crimson focus:text-light-orange disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through disabled:hover:bg-crimson/30 disabled:hover:text-gray-red sm:h-8 sm:w-8 sm:text-[13px]",
                selected:
                  "rounded-sm !bg-crimson !text-light-orange hover:!bg-crimson focus:!bg-crimson",
                range_start: "!bg-transparent",
                range_middle: "!bg-transparent",
                range_end: "!bg-transparent",
                disabled: "pointer-events-none",
                today: "rounded-sm border border-crimson",
                outside: "opacity-0 pointer-events-none",
              }}
            />
          </div>

          {/* TIME */}
          <div className="rounded-sm bg-light-orange px-2 py-1">
            <p className="mb-1 lg:mb-2 text-center text-[14px] font-bold uppercase text-gray-red">
              Time
            </p>

            {!selectedNailist ? (
            <p className="p-2 text-center text-[13px] font-medium text-gray-red">
                Select a nail artist to view available time slots.
            </p>
            ) : !appointmentDate ? (
              <p className="p-2 text-center text-[13px] font-medium text-gray-red">
                Select a date first.
              </p>
            ) : timeSlots.length === 0 ? (
              <p className="rounded-sm bg-crimson-light/70 px-4 py-4 text-center text-[13px] font-medium text-gray-red">
                No schedule available.
              </p>
            ) : (
              <div className="max-h-[190px] overflow-y-auto px-2 sm:max-h-[220px]">
                {timeSlots.map((slot) => {
                  const blocked = isTimeBlocked(slot);

                  return (
                    <Button
                      variant="bare"
                      key={slot}
                      type="button"
                      disabled={blocked}
                      onClick={() => setAppointmentTime(slot)}
                      className={`mb-2 w-full rounded-sm px-4 py-2 text-[13px] font-semibold transition ${
                        appointmentTime === slot
                          ? "bg-crimson text-light-orange"
                          : blocked
                            ? "cursor-not-allowed bg-crimson/10 text-crimson-light"
                            : "bg-crimson/30 text-crimson hover:bg-crimson hover:text-light-orange"
                      }`}
                    >
                      {formatSlot(slot)}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SummaryContent({
  selectedService,
  selectedNailist,
  appointmentDate,
  appointmentTime,
  selectedPrice,
  formatSlot,
}: {
  selectedService: Service | undefined;
  selectedNailist: NailArtist | undefined;
  appointmentDate: string;
  appointmentTime: string;
  selectedPrice: number;
  formatSlot: (slot: string) => string;
}) {
  return (
    <>
      <h4 className="mb-1 text-[14px] font-bold uppercase text-gray-red sm:text-[15px]">
        Booking Summary
      </h4>

      <div className="border-b mb-1.5"></div>

      <div className="space-y-4">
        <SummaryRow label="Service:" value={selectedService?.name || "-"} />

        <SummaryRow label="Artist:" value={selectedNailist?.name || "-"} />

        <SummaryRow label="Date:" value={appointmentDate || "-"} />

        <SummaryRow
          label="Time:"
          value={appointmentTime ? formatSlot(appointmentTime) : "-"}
        />

        <SummaryRow
          label="Price:"
          value={selectedPrice ? `₱${selectedPrice}` : "-"}
        />
      </div>
    </>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-[13px] font-bold uppercase text-gray-red sm:text-[14px]">
        {label}
      </p>

      <p className="text-right text-[13px] text-gray-red sm:text-[14px]">
        {value}
      </p>
    </div>
  );
}

export default AS_CreateAppointmentModal;