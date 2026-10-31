"use client";

import { BOOKING_STEPS } from "@/lib/client/bookingSteps";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import qrPhLogo from "@/assets/logo/qr_ph.png";
import { AlertDialog } from "@/components/organisms";
import { Badge, Button, Card } from "@/components/atoms";
import { ChoiceRow, SectionHeader, StepBar, StickyActionBar, SummaryRow } from "@/components/molecules";
import { surface } from "@/components/tokens";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { BookingStepSkeleton } from "@/components/features/client/skeletons/skeletons";
import { usePayment } from "@/hooks/client/usePayment";
import { CLIENT_PATHS } from "@/lib/client/clientNav";
import { peso } from "@/lib/dashboardFormat";

export default function Payment() {
  const { artistLabel, priceLabel, dateLabel, timeLabel, deposit, methods, toggleAgree, method, setMethod, agree, loading, isInvalid, timeLeft, modalOpen, modalTitle, modalMessage, modalAction, modalButtonText, modalDismissible, appointment, handlePay, handleModalClose } = usePayment();

  // If loading or invalid, show the placeholders (effectively hiding the pay UI)
  if (loading || isInvalid) {
    return (
      <ClientScreen title="Payment" back="history">
        <BookingStepSkeleton label="Loading your payment details" />
        <AlertDialog
          open={modalOpen}
          title={modalTitle}
          message={modalMessage}
          buttonText={modalButtonText}
          hideCloseButton={!modalDismissible}
          onClose={handleModalClose}
          onAction={modalAction}
        />
      </ClientScreen>
    );
  }

  if (!appointment) {
    return (
      <ClientScreen title="Payment" back="history">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <SectionHeader size="section" title="Invalid access" subtitle="Start a booking from the services page to pay a downpayment." className="items-center" />
          <Button to={CLIENT_PATHS.home}>
            Go home
          </Button>
        </div>
      </ClientScreen>
    );
  }

  return (
    <ClientScreen title="Payment" back="history">
      <div className="flex flex-col gap-6">
        <div className="lg:hidden"><StepBar steps={BOOKING_STEPS} current={1} label="Booking steps" /></div>
        {/* The form takes two thirds; the booking summary and the payment summary stack in the third */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
          {/* PAYMENT FORM */}
          <Card className="flex flex-col gap-6 lg:col-span-2">
            <SectionHeader
              size="section"
              title="Complete your downpayment"
              subtitle="Secure your appointment with a downpayment."
            />

            <div className="flex flex-col gap-3" role="radiogroup" aria-label="Payment method">
              <SectionHeader size="label" title="Payment method" />
              <div className="grid gap-3">
                {methods.map(({ code, label, hint }) => (
                  <ChoiceRow key={code} align="center" selected={method === code} onClick={() => setMethod(code)}>
                    <span className="flex min-w-0 items-center gap-3">
                      {/* Decorative: the name is written next to it */}
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-crimson-light bg-white p-2">
                        <Image src={qrPhLogo} alt="" width={40} height={40} className="h-full w-full object-contain" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-bold">{label}</span>
                        {hint && <span className="copy-note">{hint}</span>}
                      </span>
                    </span>
                  </ChoiceRow>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <SectionHeader size="label" title="Terms and conditions" />
              <ChoiceRow kind="checkbox" selected={agree} onClick={toggleAgree}>
                <span className="text-sm sm:text-base">
                  I agree with the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold underline"
                  >
                    Terms & Conditions<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </span>
              </ChoiceRow>
            </div>

            <div className={clsx(surface.tint, "flex flex-col gap-1 p-3")}>
              <SectionHeader size="label" title="Reservation expires in" />
              <p className="font-display text-4xl text-crimson-ink">{timeLeft}</p>
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:gap-6">
          {/* BOOKING SUMMARY: what was chosen on the Book step */}
          <Card as="aside" className="flex flex-col gap-3 lg:hidden">
            <SectionHeader size="card" title="Booking summary" />
            {appointment.service_image && (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-crimson-light/15">
                <Image src={appointment.service_image} alt={appointment.service_name} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
              </div>
            )}
            <div className="flex flex-col items-start gap-3">
              {appointment.service_category && <Badge tone="brand">{appointment.service_category}</Badge>}
              <p className="font-display text-2xl text-gray-red">{appointment.service_name}</p>
              {appointment.service_description && (
                <p className="line-clamp-3 text-sm text-gray-red" title={appointment.service_description}>{appointment.service_description}</p>
              )}
            </div>
            <dl className="border-t border-crimson-light/40 pt-2">
              <SummaryRow label="Preferred artist" value={artistLabel} />
              <SummaryRow label="Date" value={dateLabel} />
              <SummaryRow label="Time" value={timeLabel} />
              {/* Left out when this step was opened from the appointments list, which doesn't carry the location */}
              {appointment.location_text && (
                <SummaryRow label="Location" value={
                    appointment.location_url ? (
                      <a href={appointment.location_url} target="_blank" rel="noopener noreferrer" className="font-bold text-crimson-ink underline underline-offset-4 hover:text-gray-red">
                        {appointment.location_text}
                      </a>
                    ) : (
                      appointment.location_text
                    )
                  }
                />
              )}
            </dl>
          </Card>

          {/* PAYMENT SUMMARY */}
          <Card as="aside" className="flex flex-col gap-3">
            <SectionHeader size="card" title="Payment summary" />
            <dl>
              <SummaryRow label="Service" value={appointment.service_name} />
              <SummaryRow label="Preferred artist" value={artistLabel} className="hidden lg:flex" />
              <SummaryRow label="Date" value={dateLabel} className="hidden lg:flex" />
              <SummaryRow label="Time" value={timeLabel} className="hidden lg:flex" />
              <SummaryRow label="Price" value={priceLabel} />
              <SummaryRow label="Deductible from total" value={deposit ? peso(deposit.deductible) : "–"} />
              <SummaryRow label="Reservation fee" value={deposit ? peso(deposit.fee) : "–"} />
            </dl>

            <p className="flex items-baseline justify-between border-t border-crimson-light/40 pt-3 font-display text-2xl text-gray-red">
              <span>Total due</span>
              <span className="text-crimson-ink">{deposit ? peso(deposit.total) : "–"}</span>
            </p>
          </Card>
          </div>
        </div>

        <StickyActionBar>
          <Button id="pay-button" onClick={handlePay} className="w-full sm:w-auto">
            Pay downpayment
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </StickyActionBar>
      </div>

      <AlertDialog
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={handleModalClose}
        onAction={modalAction}
      />
    </ClientScreen>
  );
}
