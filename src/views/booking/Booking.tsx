"use client";

import Image from "next/image";
import { AlertDialog } from "@/components/organisms";
import BookingOptions from "../../components/booking/BookingOptions";
import { Button, LoadingBar } from "@/components/atoms";
import ArtistSelect from "../../components/booking/ArtistSelect";
import DayCalendar from "../../components/booking/DayCalendar";
import { SectionHeader, EmptyState } from "@/components/molecules";
import ClientPage from "../../components/client/ClientPage";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import SummaryRow from "../../components/booking/SummaryRow";
import TimeSlotList from "../../components/booking/TimeSlotList";
import { useBooking } from "../../hooks/useBooking";

export default function Booking() {
  const { priceLabel, pageData, isPageLoading, pageError, nailists, selectedNailist, selectedDate, selectedTime, setSelectedTime, timeSlots, month, setMonth, modalOpen, modalTitle, modalMessage, modalAction, modalButtonText, service_category, service_description, service_name, service_image, variants, selectedVariantId, setSelectedVariantId, selectedAddonIds, setSelectedAddonIds, addons, locationUrl, locationText, isDisabledDate, formatSlot, handleContinue, isSubmitting, sectionLabel, handleArtistChange, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, closeModal, reloadPage } = useBooking();

  if (isPageLoading) {
    return <LoadingBar label="Loading booking details" />;
  }

  if (pageError || !pageData) {
    return (
      <ClientPage title="Book">
        <Section bleed innerClassName="min-h-[70vh] items-center justify-center">
          <EmptyState
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
          </EmptyState>
        </Section>
      </ClientPage>
    );
  }

  return (
    <ClientPage title="Book">
      <Section bleed>
        <div className="grid grid-cols-1 items-start gap-4 md:gap-8 lg:grid-cols-2">
          {/* BOOKING FORM */}
          <div className="flex flex-col gap-4 md:gap-8">
            <SectionHeader
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
              <div className="flex items-center justify-between gap-4">
                <p className={sectionLabel}>Preferred artist</p>
                <Button variant="bare" to="/artists" className="text-sm font-bold text-crimson underline underline-offset-4 hover:text-gray-red">
                  Meet our artists
                </Button>
              </div>
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
            </div>

            <div className="flex flex-col gap-4">
              <p className={sectionLabel}>Pick date &amp; time</p>
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
                  slots={timeSlots}
                  selected={selectedTime}
                  onSelect={setSelectedTime}
                  isBlocked={isSlotBlocked}
                  format={formatSlot}
                  emptyText="No schedule available"
                />
              </div>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <Panel title="Booking summary">
            {service_image && (
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-sm bg-sand/50">
                <Image src={service_image} alt={service_name} fill sizes="(max-width: 1024px) 100vw, 560px" className="object-cover" />
              </div>
            )}
            <div className="flex flex-col gap-4">
              <p className="w-fit rounded-md border border-crimson-light px-4 py-1 label-caps text-crimson">
                {service_category}
              </p>
              <p className="font-display text-2xl uppercase tracking-widest text-gray-red">
                {service_name}
              </p>
              <p className="copy-body">{service_description}</p>
            </div>

            <dl className="border-t border-crimson-light/80 pt-4 md:pt-8">
              <SummaryRow label="Preferred artist" value={selectedNailist ? selectedNailist.name : "-"} />
              <SummaryRow label="Date" value={selectedDate || "-"} />
              <SummaryRow label="Time" value={selectedTime ? formatSlot(selectedTime) : "-"} />
              <SummaryRow label="Price" value={priceLabel} />
              <SummaryRow label="Location" value={
                  locationUrl && locationText ? (
                    <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-crimson underline underline-offset-4 hover:text-gray-red">
                      {locationText}
                    </a>
                  ) : (
                    locationText || "No location available"
                  )
                }
              />
            </dl>
          </Panel>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full px-8 sm:w-auto sm:px-16 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Reserving your slot..." : "Continue to payment"}
          </Button>
        </div>
      </Section>

      <AlertDialog
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={closeModal}
        onAction={modalAction}
      />
    </ClientPage>
  );
}
