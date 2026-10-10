"use client";

import { Link } from "@/lib/router";
import AlertModal from "../../components/ui/AlertModal";
import Button from "../../components/ui/Button";
import ChoiceRow from "../../components/ui/ChoiceRow";
import { LoadingBar } from "../../components/ui/LoadingBar";
import BackButton from "../../components/layout/BackButton";
import PageHeader from "../../components/layout/PageHeader";
import PageShell from "../../components/layout/PageShell";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import SummaryRow from "../../components/booking/SummaryRow";
import { usePayment } from "../../hooks/usePayment";

export default function Payment() {
  const { methods, toggleAgree, method, setMethod, agree, loading, isInvalid, timeLeft, modalOpen, modalTitle, modalMessage, modalAction, modalButtonText, modalDismissible, appointment, handlePay, sectionLabel, handleModalClose } = usePayment();

  // If loading or invalid, show the LoadingBar (effectively hiding the pay UI)
  if (loading || isInvalid) {
    return (
      <PageShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <LoadingBar label="Loading your payment details" />
        </div>
        <AlertModal
          open={modalOpen}
          title={modalTitle}
          message={modalMessage}
          buttonText={modalButtonText}
          hideCloseButton={!modalDismissible}
          onClose={handleModalClose}
          onAction={modalAction}
        />
      </PageShell>
    );
  }

  if (!appointment) {
    return (
      <PageShell>
        <Section innerClassName="min-h-[70vh] items-center justify-center gap-4 text-center md:gap-8">
          <PageHeader align="center" title="Invalid access" subtitle="Start a booking from the services page to pay a downpayment." />
          <Button to="/">
            Go home
          </Button>
        </Section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Section>
        <div className="grid grid-cols-1 items-start gap-4 md:gap-8 lg:grid-cols-2">
          {/* PAYMENT FORM */}
          <div className="flex flex-col gap-4 md:gap-8">
            <BackButton />
            <PageHeader
              title="Complete your downpayment"
              subtitle="Secure your appointment with a downpayment."
            />

            <div className="flex flex-col gap-4" role="radiogroup" aria-label="Payment method">
              <p className={sectionLabel}>Payment method</p>
              <div className="grid gap-4">
                {methods.map(({ code, label }) => (
                  <ChoiceRow key={code} selected={method === code} onClick={() => setMethod(code)}>
                    <span className="font-bold">{label}</span>
                  </ChoiceRow>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className={sectionLabel}>Terms and conditions</p>
              <ChoiceRow kind="checkbox" selected={agree} onClick={toggleAgree}>
                <span className="text-sm sm:text-base">
                  I agree with the{" "}
                  <Link
                    to="/terms"
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold underline"
                  >
                    Terms & Conditions
                  </Link>
                </span>
              </ChoiceRow>
            </div>

            <Panel>
              <p className="text-sm font-bold uppercase tracking-widest text-gray-red">
                Reservation expires in
              </p>
              <p className="font-display text-4xl text-crimson">{timeLeft}</p>
            </Panel>
          </div>

          {/* SUMMARY */}
          <Panel title="Payment summary">
            <dl>
              <SummaryRow label="Service" value={appointment.service_name} />
              <SummaryRow
                label="Preferred artist"
                value={
                  appointment.nailist_category_id === 1
                    ? `★ ${appointment.nailist_name}`
                    : appointment.nailist_name
                }
              />
              <SummaryRow label="Date" value={appointment.appointment_date} />
              <SummaryRow label="Time" value={appointment.appointment_time} />
              <SummaryRow
                label="Price"
                value={appointment.service_price ? `Starts at ₱${appointment.service_price}` : ""}
              />
              <SummaryRow label="Deductible from total" value="₱400" />
              <SummaryRow label="Reservation fee" value="₱100" />
            </dl>

            <p className="flex items-baseline justify-between border-t border-crimson-light/80 pt-4 font-display text-2xl uppercase tracking-widest text-gray-red md:pt-8">
              <span>Total due</span>
              <span className="text-crimson">₱500</span>
            </p>
          </Panel>
        </div>

        <div className="flex justify-center">
          <Button id="pay-button" onClick={handlePay} className="px-8 sm:px-16">
            Pay downpayment
          </Button>
        </div>
      </Section>

      <AlertModal
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={handleModalClose}
        onAction={modalAction}
      />
    </PageShell>
  );
}
