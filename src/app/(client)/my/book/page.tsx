"use client";

import Image from "next/image";
import clsx from "clsx";
import { AlertDialog } from "@/components/organisms";
import { Avatar, Badge, Button, Card, LoadingBar, Select } from "@/components/atoms";
import { SectionHeader, EmptyState, SummaryRow, TimeSlotList } from "@/components/molecules";
import DayCalendar from "@/components/molecules/DayCalendar";
import { surface } from "@/components/tokens";
import BookingOptions from "@/components/features/client/booking/BookingOptions";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useBooking } from "@/hooks/client/useBooking";

export default function Booking() {
  const { priceLabel, pageData, isPageLoading, pageError, nailists, selectedNailist, selectedDate, selectedTime, setSelectedTime, timeSlots, month, setMonth, modalOpen, modalTitle, modalMessage, modalAction, modalButtonText, service_category, service_description, service_name, service_image, variants, selectedVariantId, setSelectedVariantId, selectedAddonIds, setSelectedAddonIds, addons, locationUrl, locationText, isDisabledDate, formatSlot, handleContinue, isSubmitting, handleArtistChange, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, closeModal, reloadPage } = useBooking();

  if (isPageLoading) {
    return <LoadingBar label="Loading booking details" />;
  }

  if (pageError || !pageData) {
    return (
      <ClientScreen title="Book" back="history">
        <div className="flex min-h-[60vh] items-center justify-center">
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
        </div>
      </ClientScreen>
    );
  }

  return (
    <ClientScreen title="Book" back="history">
      <div className="flex flex-col gap-6">
        {/* The form takes two thirds and the summary one third; both cards stretch to the row's
            height, so they always end level */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
          {/* BOOKING FORM */}
          <Card className="flex flex-col gap-6 lg:col-span-2">
            <SectionHeader
              size="section"
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

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <SectionHeader size="label" title="Preferred artist" />
                {/* A new tab, so the booking in progress isn't lost */}
                <Button variant="bare" href="/artists" className="text-sm font-bold text-crimson-ink underline underline-offset-4 hover:text-gray-red">
                  Meet our artists<span className="sr-only"> (opens in a new tab)</span>
                </Button>
              </div>
              {nailists.length === 0 ? (
                <p className={clsx(surface.tint, "px-3 py-3 text-sm text-gray-red")}>
                  No available artists for this service.
                </p>
              ) : (
                // Each artist's face beside their name, and their title underneath
                <Select
                  aria-label="Preferred artist"
                  placeholder="Select artist"
                  value={selectedNailist?.id ?? ""}
                  onChange={(e) => handleArtistChange(Number(e.target.value))}
                  options={nailists.map((n) => ({
                    value: String(n.id),
                    label: (
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{n.name}</span>
                        <span className="truncate text-xs font-normal text-gray-red">{n.category_id === 1 ? "Master Technician" : "Junior Technician"}</span>
                      </span>
                    ),
                    leading: <Avatar name={n.name} imageUrl={n.image ?? ""} size="sm" cropTop decorative />,
                  }))}
                  triggerClassName="font-bold"
                />
              )}
            </div>

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
          </Card>

          {/* SUMMARY */}
          <Card as="aside" className="flex flex-col gap-3">
            <SectionHeader size="card" title="Booking summary" />
            {service_image && (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-crimson-light/15">
                <Image src={service_image} alt={service_name} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
              </div>
            )}
            <div className="flex flex-col items-start gap-3">
              <Badge tone="brand">{service_category}</Badge>
              <p className="font-display text-2xl text-gray-red">
                {service_name}
              </p>
              {/* A reminder of what's booked: the full description is on the service's page */}
              <p className="line-clamp-3 text-sm text-gray-red" title={service_description}>{service_description}</p>
            </div>

            <dl className="border-t border-crimson-light/40 pt-2">
              <SummaryRow label="Preferred artist" value={selectedNailist ? selectedNailist.name : "-"} />
              <SummaryRow label="Date" value={selectedDate || "-"} />
              <SummaryRow label="Time" value={selectedTime ? formatSlot(selectedTime) : "-"} />
              <SummaryRow label="Price" value={priceLabel} />
              <SummaryRow label="Location" value={
                  locationUrl && locationText ? (
                    <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-crimson-ink underline underline-offset-4 hover:text-gray-red">
                      {locationText}
                    </a>
                  ) : (
                    locationText || "No location available"
                  )
                }
              />
            </dl>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full px-9 sm:w-auto sm:px-15 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Reserving your slot..." : "Continue to payment"}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={closeModal}
        onAction={modalAction}
      />
    </ClientScreen>
  );
}
