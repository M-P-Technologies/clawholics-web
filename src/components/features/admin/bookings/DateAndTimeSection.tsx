"use client";

import clsx from "clsx";
import { SectionHeader, TimeSlotList } from "@/components/molecules";
import DayCalendar from "@/components/molecules/DayCalendar";
import { surface } from "@/components/tokens";
import type { CreateAppointment } from "@/hooks/admin/useCreateAppointment";
import { formatSlot, toLocalDate, toLocalDateString } from "@/lib/admin/createAppointment";

// The create-appointment form's date and time, drawn like the client's booking page: the calendar
// in a tinted box and the day's times beside it, side by side once the form itself is wide enough
export default function DateAndTimeSection({ a }: { a: CreateAppointment }) {
  const {
    selectedNailist, loadingSlots, appointmentDate, appointmentTime, month, timeSlots, fullyBookedDates,
    setMonth, setAppointmentTime, handleDateSelect, isDisabledDate, isTimeBlocked,
  } = a;
  return (
    <section aria-label="Date and time" className="flex flex-col gap-3">
      <SectionHeader size="label" title="Date and time" />

      {loadingSlots ? (
        <p className={clsx(surface.tint, "px-3 py-9 text-center text-[13px] text-gray-red")}>Loading availability...</p>
      ) : (
        // A container query, not a screen breakpoint: beside the summary the form is narrower than the screen
        <div className="@container">
          <div className="flex flex-col gap-3 @xl:flex-row @xl:items-start">
            <div className={clsx(surface.tint, "flex shrink-0 items-center justify-center p-3")}>
              <DayCalendar
                month={month}
                onMonthChange={setMonth}
                selected={appointmentDate ? toLocalDate(appointmentDate) : undefined}
                onSelect={handleDateSelect}
                isDisabled={isDisabledDate}
                isFullyBooked={(date) => fullyBookedDates.includes(toLocalDateString(date))}
              />
            </div>

            <TimeSlotList
              boxed
              columns={2}
              slots={selectedNailist && appointmentDate ? timeSlots : []}
              selected={appointmentTime}
              onSelect={setAppointmentTime}
              isBlocked={isTimeBlocked}
              format={formatSlot}
              emptyText={
                !selectedNailist ? "Select a nail artist to view available time slots." : !appointmentDate ? "Select a date first." : "No schedule available."
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
