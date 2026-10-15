"use client";

import { CircleCheckBig as CheckIcon } from "lucide-react";
import { Button, Card, LoadingBar } from "@/components/atoms";
import { SectionHeader, EmptyState, SummaryRow } from "@/components/molecules";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { usePaymentConfirmation } from "@/hooks/client/usePaymentConfirmation";
import { CLIENT_PATHS } from "@/lib/client/clientNav";

export default function PaymentConfirmation() {
  const { isFailed, isConfirmed, appointment_id, data, payment, loading, timedOut, checkAgain } = usePaymentConfirmation();

  if (!appointment_id) {
    return (
      <ClientScreen title="Payment" back={CLIENT_PATHS.appointments}>
        <div className="flex min-h-[60vh] items-center justify-center text-center">
          <p className="text-lg text-gray-red">Invalid access. No appointment ID.</p>
        </div>
      </ClientScreen>
    );
  }

  if (loading) {
    return <LoadingBar label="Loading your payment" />;
  }

  if (isFailed) {
    return (
      <ClientScreen title="Payment" back={CLIENT_PATHS.appointments}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <SectionHeader size="section" title="Payment failed" className="items-center" />
          <p className="mx-auto max-w-xl text-gray-red/90">
            Your payment session was <b>not completed</b> or may have <b>expired during payment</b>.
            No booking was confirmed and your selected timeslot has been released for other customers.
          </p>
          <p className="mx-auto max-w-xl text-gray-red/90">
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
        </div>
      </ClientScreen>
    );
  }

  if (!isConfirmed) {
    // We stopped asking after two minutes. Say so, and what to do, instead of spinning forever.
    if (timedOut) {
      return (
        <ClientScreen title="Payment" back={CLIENT_PATHS.appointments}>
          <div className="flex min-h-[60vh] items-center justify-center">
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
          </div>
        </ClientScreen>
      );
    }

    // Not inside a card or an animated wrapper: one that animates with `translate` makes a fixed
    // child position itself inside it instead of covering the screen.
    return (
      <LoadingBar
        label="Confirming your payment"
        hint="This page updates by itself. Please keep it open and don't pay again."
      />
    );
  }

  return (
    <ClientScreen title="Payment" back={CLIENT_PATHS.appointments}>
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center gap-4 text-center md:gap-6">
        <CheckIcon size={56} className="text-crimson" strokeWidth={1.5} aria-hidden="true" />

        <SectionHeader size="section" title="Payment successful" className="items-center" />

        <p className="mx-auto max-w-xl text-gray-red/90">
          Thank you, {payment?.first_name}! Your downpayment of{" "}
          <b>₱500 via {payment?.payment_method ?? "N/A"}</b> has been received. Please check your
          email <b>({payment?.email ?? "your email"})</b> to view your complete appointment details
          and a few extra reminders regarding your booking. We look forward to pampering you soon!
        </p>

        {data ? (
          <Card className="w-full max-w-xl text-left">
            <dl>
              <SummaryRow label="Service" value={data.service_name} />
              <SummaryRow label="Date" value={data.appointment_date} />
              <SummaryRow label="Time" value={data.appointment_time} />
              <SummaryRow label="Amount paid" value="₱500" />
            </dl>
          </Card>
        ) : (
          <p className="text-gray-red">Failed to load appointment details.</p>
        )}

        <Button to={CLIENT_PATHS.home}>
          Back to home
        </Button>
      </div>
    </ClientScreen>
  );
}
