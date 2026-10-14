"use client";

import { CircleCheckBig as CheckIcon } from "lucide-react";
import { Button, LoadingBar } from "@/components/atoms";
import { SectionHeader, EmptyState } from "@/components/molecules";
import ClientPage from "../../components/client/ClientPage";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import SummaryRow from "../../components/booking/SummaryRow";
import { usePaymentConfirmation } from "../../hooks/usePaymentConfirmation";
import { CLIENT_PATHS } from "../../lib/client/clientNav";

export default function PaymentConfirmation() {
  const { isFailed, isConfirmed, appointment_id, data, payment, loading, timedOut, checkAgain } = usePaymentConfirmation();

  if (!appointment_id) {
    return (
      <ClientPage title="Payment" back={CLIENT_PATHS.appointments}>
        <Section bleed innerClassName="flex min-h-[70vh] items-center justify-center text-center">
          <p className="text-lg text-gray-red">Invalid access. No appointment ID.</p>
        </Section>
      </ClientPage>
    );
  }

  if (loading) {
    return <LoadingBar label="Loading your payment" />;
  }

  if (isFailed) {
    return (
      <ClientPage title="Payment" back={CLIENT_PATHS.appointments}>
        <Section bleed innerClassName="min-h-[70vh] items-center justify-center gap-4 text-center md:gap-8">
          <SectionHeader align="center" title="Payment failed" />
          <p className="mx-auto max-w-2xl copy-lead">
            Your payment session was <b>not completed</b> or may have <b>expired during payment</b>.
            No booking was confirmed and your selected timeslot has been released for other customers.
          </p>
          <p className="mx-auto max-w-2xl copy-lead">
            If your account was charged or if you have any other concerns, please don't hesitate to
            contact us. We're here to help!
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button to={CLIENT_PATHS.home}>
              Back to home
            </Button>
            <Button variant="secondary" to="/contact">
              Contact us
            </Button>
          </div>
        </Section>
      </ClientPage>
    );
  }

  if (!isConfirmed) {
    // We stopped asking after two minutes. Say so, and what to do, instead of spinning forever.
    if (timedOut) {
      return (
        <ClientPage title="Payment" back={CLIENT_PATHS.appointments}>
          <Section bleed innerClassName="min-h-[70vh] items-center justify-center">
            <EmptyState
              kind="info"
              title="Still confirming your payment"
              message="Your bank or e-wallet is taking longer than usual to tell us. If you already paid, please don't pay again: your slot stays safe while we wait. Check again in a minute, or look at My Schedule later today. If it still isn't confirmed, contact us and we will sort it out."
            >
              <Button type="button" onClick={checkAgain} >
                Check again
              </Button>
              <Button variant="secondary" to={CLIENT_PATHS.appointments}>
                Go to My Schedule
              </Button>
              <Button variant="secondary" to="/contact">
                Contact us
              </Button>
            </EmptyState>
          </Section>
        </ClientPage>
      );
    }

    // Not inside a Section: its entrance animation uses `translate`, which makes a fixed child
    // position itself inside the section instead of covering the screen.
    return (
      <LoadingBar
        label="Confirming your payment"
        hint="This page updates by itself. Please keep it open and don't pay again."
      />
    );
  }

  return (
    <ClientPage title="Payment" back={CLIENT_PATHS.appointments}>
      <Section bleed innerClassName="min-h-[70vh] max-w-3xl items-center gap-4 text-center md:gap-8">
        <CheckIcon size={56} className="text-crimson" strokeWidth={1.5} aria-hidden="true" />

        <SectionHeader align="center" title="Payment successful" />

        <p className="mx-auto max-w-xl copy-lead">
          Thank you, {payment?.first_name}! Your downpayment of{" "}
          <b>₱500 via {payment?.payment_method ?? "N/A"}</b> has been received. Please check your
          email <b>({payment?.email ?? "your email"})</b> to view your complete appointment details
          and a few extra reminders regarding your booking. We look forward to pampering you soon!
        </p>

        {data ? (
          <Panel className="w-full max-w-xl text-left">
            <dl>
              <SummaryRow label="Service" value={data.service_name} />
              <SummaryRow label="Date" value={data.appointment_date} />
              <SummaryRow label="Time" value={data.appointment_time} />
              <SummaryRow label="Amount paid" value="₱500" />
            </dl>
          </Panel>
        ) : (
          <p className="text-gray-red">Failed to load appointment details.</p>
        )}

        <Button to={CLIENT_PATHS.home}>
          Back to home
        </Button>
      </Section>
    </ClientPage>
  );
}
