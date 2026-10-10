"use client";

import AlertModal from "../../components/ui/AlertModal";
import BookingOptions from "../../components/booking/BookingOptions";
import Button from "../../components/ui/Button";
import ArtistSelect from "../../components/booking/ArtistSelect";
import BackButton from "../../components/layout/BackButton";
import DayCalendar from "../../components/booking/DayCalendar";
import PageHeader from "../../components/layout/PageHeader";
import PageShell from "../../components/layout/PageShell";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import StatePanel from "../../components/ui/StatePanel";
import SummaryRow from "../../components/booking/SummaryRow";
import TimeSlotList from "../../components/booking/TimeSlotList";
import { LoadingBar } from "../../components/ui/LoadingBar";
import { useBooking } from "../../hooks/useBooking";

export default function Booking() {
  const { priceLabel, pageData, isPageLoading, pageError, nailists, selectedNailist, selectedDate, selectedTime, setSelectedTime, timeSlots, month, setMonth, modalOpen, modalTitle, modalMessage, modalAction, modalButtonText, service_category, service_description, service_name, variants, selectedVariantId, setSelectedVariantId, selectedAddonIds, setSelectedAddonIds, addons, locationUrl, locationText, isDisabledDate, formatSlot, handleContinue, isSubmitting, sectionLabel, handleArtistChange, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, closeModal, reloadPage } = useBooking();

  if (isPageLoading) {
    return <LoadingBar label="Loading booking details" />;
  }

  if (pageError || !pageData) {
    return (
      <PageShell>
        <Section innerClassName="min-h-[70vh] items-center justify-center">
          <StatePanel
            kind="error"
            title="We couldn't load the booking page"
            message={
              pageError ||
              "We couldn't get the studio's location and details. This is usually a weak connection or a brief server hiccup. Nothing was booked, and you haven't been charged. Please try again."
            }
          >
            <Button onClick={reloadPage} >
              Try again
            </Button>
          </StatePanel>
        </Section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Section>
        <div className="grid grid-cols-1 items-start gap-4 md:gap-8 lg:grid-cols-2">
          {/* BOOKING FORM */}
          <div className="flex flex-col gap-4 md:gap-8">
            <BackButton />
            <PageHeader
              title="Book your visit"
              subtitle="Select your preferred artist, and a time that works for you."
            />

            <BookingOptions
              variants={variants}
              addons={addons}
              variantId={selectedVariantId}
              addonIds={selectedAddonIds}
              onVariantChange={setSelectedVariantId}
              onAddonsChange={setSelectedAddonIds}
            />

            <div className="flex flex-col gap-2">
              <p className={sectionLabel}>Preferred artist</p>
              {nailists.length === 0 ? (
                <p className="rounded-md border border-crimson-light bg-light-orange px-4 py-4 text-gray-red">
                  No available artists for this service.
                </p>
              ) : (
                <ArtistSelect
                  nailists={nailists}
                  selectedId={selectedNailist?.id ?? null}
                  onSelect={handleArtistChange}
                />
              )}

              <p className="text-sm text-gray-red/80">★ = Master technician</p>
            </div>

            <div className="flex flex-col gap-4">
              <p className={sectionLabel}>Pick date &amp; time</p>
              <div className="flex flex-col gap-4 lg:flex-row">
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
                  slots={timeSlots}
                  selected={selectedTime}
                  onSelect={setSelectedTime}
                  isBlocked={isSlotBlocked}
                  format={formatSlot}
                  emptyText="No schedule available"
                />
              </div>
            </div>

            {/* LOCATION */}
            <div className="flex flex-col gap-4">
              <p className={sectionLabel}>Location</p>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-gray-red">{locationText || "No location available"}</p>

                <Button
                  variant="secondary"
                  href={locationUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  
                >
                  Get directions
                </Button>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <Panel title="Booking summary">
            <div className="flex flex-col gap-4">
              <p className="w-fit rounded-md border border-crimson-light px-4 py-1 text-sm font-bold uppercase tracking-widest text-crimson">
                {service_category}
              </p>
              <p className="font-display text-2xl uppercase tracking-widest text-gray-red">
                {service_name}
              </p>
              <p className="text-sm leading-relaxed text-gray-red/80">{service_description}</p>
            </div>

            <dl className="border-t border-crimson-light/80 pt-4 md:pt-8">
              <SummaryRow
                label="Preferred artist"
                value={
                  selectedNailist
                    ? selectedNailist.category_id === 1
                      ? `★ ${selectedNailist.name}`
                      : selectedNailist.name
                    : "-"
                }
              />
              <SummaryRow label="Date" value={selectedDate || "-"} />
              <SummaryRow label="Time" value={selectedTime ? formatSlot(selectedTime) : "-"} />
              <SummaryRow label="Price" value={priceLabel} />
              <SummaryRow label="Location" value={locationText || "No location available"} />
            </dl>
          </Panel>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="px-8 sm:px-16 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Reserving your slot..." : "Continue to payment"}
          </Button>
        </div>
      </Section>

      <AlertModal
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={closeModal}
        onAction={modalAction}
      />
    </PageShell>
  );
}
