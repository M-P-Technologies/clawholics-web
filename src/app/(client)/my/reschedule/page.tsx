"use client";

import clsx from "clsx";
import { AlertDialog } from "@/components/organisms";
import { Button, Card, LoadingBar } from "@/components/atoms";
import { SectionHeader, SummaryRow, TimeSlotList } from "@/components/molecules";
import DayCalendar from "@/components/molecules/DayCalendar";
import { surface } from "@/components/tokens";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useReschedule } from "@/hooks/client/useReschedule";

export default function Reschedule() {
  const { formatSlot, oldDateLabel, oldTimeLabel, newDateLabel, newTimeLabel, isLoaded, appointment, isSubmitting, month, setMonth, selectedDate, selectedTime, setSelectedTime, modalOpen, modalTitle, modalMessage, isDisabledDate, handleConfirmReschedule, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, uniqueTimeSlots, handleModalClose } = useReschedule();

  if (!isLoaded || !appointment) return <LoadingBar label="Loading your appointment" />;

  return (
    <ClientScreen title="Reschedule" back="history">
      <div className="flex flex-col gap-6">
        {/* As in Book: the form takes two thirds and the summary one third; both cards stretch to the
            row's height, so they always end level */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
          {/* NEW DATE AND TIME */}
          <Card className="flex flex-col gap-6 lg:col-span-2">
            <SectionHeader
              size="section"
              title="Reschedule your visit"
              subtitle={`Select a new date and time for your ${appointment.service_name} with ${appointment.nailist_name}.`}
            />

            <div className="flex flex-col gap-3">
              <SectionHeader size="label" title="Pick date & time" />
              {/* Side by side only when this column itself is wide enough (the two blocks need about 565px);
                  a screen-width breakpoint is wrong here, since beside the summary card the column is narrower. */}
              <div className="@container">
              <div className="flex flex-col gap-3 @xl:flex-row">
                <div className={clsx(surface.tint, "flex items-center justify-center p-3")}>
                  <DayCalendar
                    monthsAhead={1}
                    month={month}
                    onMonthChange={setMonth}
                    selected={selectedDay}
                    onSelect={handleDateSelect}
                    isDisabled={isDisabledDate}
                    isFullyBooked={isDateFullyBooked}
                  />
                </div>

                <TimeSlotList
                  boxed
                  slots={uniqueTimeSlots}
                  selected={selectedTime}
                  onSelect={setSelectedTime}
                  isBlocked={isSlotBlocked}
                  format={formatSlot}
                  emptyText="Select a date to view available times."
                />
              </div>
              </div>
            </div>
          </Card>

          {/* SUMMARY: the visit as booked, then the new date and time */}
          <Card as="aside" className="flex flex-col gap-3">
            <SectionHeader size="card" title="Reschedule summary" />
            <div className="flex flex-col items-start gap-3">
              <p className="font-display text-2xl text-gray-red">
                {appointment.service_name}
              </p>
              <p className="line-clamp-3 text-sm text-gray-red" title={appointment.service_description}>{appointment.service_description}</p>
            </div>

            <dl className="border-t border-crimson-light/40 pt-2">
              <SummaryRow label="Artist" value={appointment.nailist_name} />
              <SummaryRow label="Old date" value={oldDateLabel} />
              <SummaryRow label="Old time" value={oldTimeLabel} />
            </dl>

            <div className="flex flex-col gap-1 border-t border-crimson-light/40 pt-3">
              <SectionHeader size="label" title="New selection" />
              <dl>
                <SummaryRow label="New date" value={<b>{newDateLabel}</b>} />
                <SummaryRow label="New time" value={<b>{newTimeLabel}</b>} />
              </dl>
            </div>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleConfirmReschedule}
            disabled={!selectedDate || !selectedTime || isSubmitting}
            aria-busy={isSubmitting}
            className="w-full sm:w-auto disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Processing..." : "Confirm reschedule"}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText="OK"
        onClose={handleModalClose}
      />
    </ClientScreen>
  );
}
