"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { TimeSlotList } from "@/components/molecules";
import type { CreateAppointment } from "@/hooks/admin/useCreateAppointment";
import { formatSlot, toLocalDate, toLocalDateString } from "@/lib/admin/createAppointment";

// The date-and-time block of the create-appointment form (drawn twice: phone and desktop position)
export default function DateAndTimeSection({ a }: { a: CreateAppointment }) {
  const {
    selectedNailist, loadingSlots, appointmentDate, appointmentTime, month, timeSlots, fullyBookedDates,
    setMonth, setAppointmentTime, handleDateSelect, isDisabledDate, isTimeBlocked,
  } = a;
  return (
    <>
      <h4 className="font-display text-lg font-normal text-gray-red">
        Date and time
      </h4>

      {loadingSlots ? (
        <div className="rounded-xl bg-crimson-light/15 px-4 py-8 text-center text-[13px] text-gray-red/70">
          Loading availability...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* CALENDAR */}
          <div className="flex justify-center rounded-xl bg-light-orange/40 px-2 py-2">
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
                    "h-7 w-7 rounded-md bg-crimson-light/40 text-[12px] font-bold text-gray-red transition-colors duration-200 hover:bg-crimson hover:text-light-orange focus:bg-crimson focus:text-light-orange disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through disabled:hover:bg-crimson-light/40 disabled:hover:text-gray-red sm:h-8 sm:w-8 sm:text-[13px]",
                selected:
                  "rounded-md [&>button]:!bg-berry [&>button]:!text-pearl",
                range_start: "!bg-transparent",
                range_middle: "!bg-transparent",
                range_end: "!bg-transparent",
                disabled: "pointer-events-none",
                today: "[&>button]:ring-2 [&>button]:ring-crimson/60",
                outside: "opacity-0 pointer-events-none",
              }}
            />
          </div>

          {/* TIME */}
          <TimeSlotList
            columns={2}
            slots={selectedNailist && appointmentDate ? timeSlots : []}
            selected={appointmentTime}
            onSelect={setAppointmentTime}
            isBlocked={isTimeBlocked}
            format={formatSlot}
            emptyText={
              !selectedNailist
                ? "Select a nail artist to view available time slots."
                : !appointmentDate
                  ? "Select a date first."
                  : "No schedule available."
            }
          />
        </div>
      )}
    </>
  );
}
