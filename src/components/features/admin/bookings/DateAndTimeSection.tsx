"use client";

import { TimeSlotList } from "@/components/molecules";
import DayCalendar from "@/components/molecules/DayCalendar";
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
        <div className="rounded-xl bg-crimson-light/15 px-3 py-9 text-center text-[13px] text-gray-red">
          Loading availability...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {/* CALENDAR */}
          <div className="flex justify-center rounded-xl bg-light-orange/40 px-2 py-2">
            <DayCalendar
              size="sm"
              month={month}
              onMonthChange={setMonth}
              selected={appointmentDate ? toLocalDate(appointmentDate) : undefined}
              onSelect={handleDateSelect}
              isDisabled={isDisabledDate}
              isFullyBooked={(date) => fullyBookedDates.includes(toLocalDateString(date))}
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
