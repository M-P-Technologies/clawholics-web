"use client";

import AlertModal from "../../../components/ui/AlertModal";
import Button from "../../../components/ui/Button";
import { LoadingBar } from "../../../components/ui/LoadingBar";
import BackButton from "../../../components/layout/BackButton";
import DayCalendar from "../components/DayCalendar";
import PageHeader from "../../../components/layout/PageHeader";
import PageShell from "../../../components/layout/PageShell";
import Panel from "../../../components/layout/Panel";
import Section from "../../../components/layout/Section";
import SummaryRow from "../components/SummaryRow";
import TimeSlotList from "../components/TimeSlotList";
import { useReschedule } from "../hooks/useReschedule";
import { formatSlot } from "../lib/reschedule";

export default function Reschedule() {
  const { isLoaded, appointment, isSubmitting, month, setMonth, selectedDate, selectedTime, setSelectedTime, modalOpen, modalTitle, modalMessage, isDisabledDate, formatDisplayDate, handleConfirmReschedule, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, uniqueTimeSlots, handleModalClose } = useReschedule();

  if (!isLoaded || !appointment) return <LoadingBar label="Loading your appointment" />;

  return (
    <PageShell>
      <Section>
        <BackButton />

        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-5 lg:gap-16 xl:grid-cols-2">
          <div className="flex flex-col gap-4 md:gap-8 lg:col-span-3 xl:col-span-1">
            <PageHeader
              title="Reschedule your visit"
              subtitle={`Select a new date and time for your ${appointment.service_name} with ${appointment.nailist_name}.`}
            />

            <div className="flex flex-col gap-4">
            <p className="label-caps">
              Pick date &amp; time
            </p>

            {/* Side by side only when this column itself is wide enough (the two blocks need about 565px);
                a screen-width breakpoint is wrong here, since beside the summary panel the column is narrower. */}
            <div className="@container">
            <div className="flex flex-col gap-4 @xl:flex-row">
              <div className="flex items-center justify-center rounded-sm border border-crimson-light/80 bg-light-orange px-4 py-4">
                <DayCalendar
                  month={month}
                  onMonthChange={setMonth}
                  selected={selectedDay}
                  onSelect={handleDateSelect}
                  isDisabled={isDisabledDate}
                  isFullyBooked={isDateFullyBooked}
                />
              </div>

              <TimeSlotList
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
          </div>

          <div className="flex h-fit flex-col gap-4 md:gap-8 lg:col-span-2 xl:col-span-1">
            <Panel title="Current appointment">
              <p className="font-display text-2xl uppercase tracking-widest text-gray-red">
                {appointment.service_name}
              </p>
              <p className="copy-note">
                {appointment.service_description}
              </p>
              <dl>
                <SummaryRow label="Artist" value={appointment.nailist_name} />
                <SummaryRow label="Old date" value={formatDisplayDate(appointment.appointment_date)} />
                <SummaryRow label="Old time" value={formatSlot(appointment.appointment_time)} />
              </dl>
            </Panel>

            <Panel title="New selection">
              <dl>
                <SummaryRow
                  label="New date"
                  value={<b>{formatDisplayDate(selectedDate) || "-"}</b>}
                />
                <SummaryRow
                  label="New time"
                  value={<b>{selectedTime ? formatSlot(selectedTime) : "-"}</b>}
                />
              </dl>
            </Panel>
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
      </Section>

      <AlertModal
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText="OK"
        onClose={handleModalClose}
      />
    </PageShell>
  );
}
