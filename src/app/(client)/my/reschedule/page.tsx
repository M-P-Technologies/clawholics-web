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

        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-5 lg:gap-16 xl:grid-cols-2">
          <Card className="flex flex-col gap-6 lg:col-span-3 xl:col-span-1">
            <SectionHeader
              size="section"
              title="Reschedule your visit"
              subtitle={`Select a new date and time for your ${appointment.service_name} with ${appointment.nailist_name}.`}
            />

            <div className="flex flex-col gap-3">
            <SectionHeader size="label" title="Pick date & time" />

            {/* Side by side only when this column itself is wide enough (the two blocks need about 565px);
                a screen-width breakpoint is wrong here, since beside the summary cards the column is narrower. */}
            <div className="@container">
            <div className="flex flex-col gap-4 @xl:flex-row">
              <div className={clsx(surface.tint, "flex items-center justify-center p-4")}>
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

          <div className="flex h-fit flex-col gap-4 md:gap-8 lg:col-span-2 xl:col-span-1">
            <Card className="flex flex-col gap-3">
              <SectionHeader size="card" title="Current appointment" />
              <p className="font-display text-xl text-gray-red">
                {appointment.service_name}
              </p>
              <p className="text-sm text-gray-red/80">
                {appointment.service_description}
              </p>
              <dl>
                <SummaryRow label="Artist" value={appointment.nailist_name} />
                <SummaryRow label="Old date" value={oldDateLabel} />
                <SummaryRow label="Old time" value={oldTimeLabel} />
              </dl>
            </Card>

            <Card className="flex flex-col gap-3">
              <SectionHeader size="card" title="New selection" />
              <dl>
                <SummaryRow
                  label="New date"
                  value={<b>{newDateLabel}</b>}
                />
                <SummaryRow
                  label="New time"
                  value={<b>{newTimeLabel}</b>}
                />
              </dl>
            </Card>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleConfirmReschedule}
            disabled={!selectedDate || !selectedTime || isSubmitting}
            className="px-8 sm:px-12"
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
