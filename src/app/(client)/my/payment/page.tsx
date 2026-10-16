"use client";

import Image from "next/image";
import clsx from "clsx";
import qrPhLogo from "@/assets/logo/qr_ph.png";
import { AlertDialog } from "@/components/organisms";
import { Button, Card, LoadingBar } from "@/components/atoms";
import { ChoiceRow, SectionHeader, SummaryRow } from "@/components/molecules";
import { surface } from "@/components/tokens";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { usePayment } from "@/hooks/client/usePayment";
import { CLIENT_PATHS } from "@/lib/client/clientNav";

export default function Payment() {
  const { artistLabel, priceLabel, methods, toggleAgree, method, setMethod, agree, loading, isInvalid, timeLeft, modalOpen, modalTitle, modalMessage, modalAction, modalButtonText, modalDismissible, appointment, handlePay, handleModalClose } = usePayment();

  // If loading or invalid, show the LoadingBar (effectively hiding the pay UI)
  if (loading || isInvalid) {
    return (
      <ClientScreen title="Payment" back="history">
        <div className="flex min-h-[70vh] items-center justify-center">
          <LoadingBar label="Loading your payment details" />
        </div>
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
        {/* As on the Book step: the form takes two thirds and the summary one third, and both cards
            stretch to the row's height, so they always end level */}
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

          {/* SUMMARY */}
          <Card as="aside" className="flex flex-col gap-3">
            <SectionHeader size="card" title="Payment summary" />
            <dl>
              <SummaryRow label="Service" value={appointment.service_name} />
              <SummaryRow label="Preferred artist" value={artistLabel} />
              <SummaryRow label="Date" value={appointment.appointment_date} />
              <SummaryRow label="Time" value={appointment.appointment_time} />
              <SummaryRow label="Price" value={priceLabel} />
              <SummaryRow label="Deductible from total" value="₱400" />
              <SummaryRow label="Reservation fee" value="₱100" />
            </dl>

            <p className="flex items-baseline justify-between border-t border-crimson-light/40 pt-3 font-display text-2xl text-gray-red">
              <span>Total due</span>
              <span className="text-crimson-ink">₱500</span>
            </p>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button id="pay-button" onClick={handlePay} className="px-9 sm:px-15">
            Pay downpayment
          </Button>
        </div>
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
