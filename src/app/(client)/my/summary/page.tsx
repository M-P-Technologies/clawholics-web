"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { BOOKING_STEPS } from "@/lib/client/bookingSteps";
import { Badge, Button, Card } from "@/components/atoms";
import { SectionHeader, StepBar, StickyActionBar, SummaryRow } from "@/components/molecules";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useBookingSummary } from "@/hooks/client/useBookingSummary";
import { CLIENT_PATHS } from "@/lib/client/clientNav";

export default function BookingSummary() {
  const { appointment, wide, artistLabel, dateLabel, timeLabel, goToPayment } = useBookingSummary();

  if (!appointment) {
    return (
      <ClientScreen title="Booking summary" back="history">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <SectionHeader size="section" title="Invalid access" subtitle="Start a booking from the services page to see its summary." className="items-center" />
          <Button to={CLIENT_PATHS.home}>Go home</Button>
        </div>
      </ClientScreen>
    );
  }

  // From `lg` the payment shows the summary itself; the page is on its way there
  if (wide) return null;

  return (
    <ClientScreen title="Booking summary" back="history">
      <div className="flex flex-col gap-6">
        <StepBar steps={BOOKING_STEPS} current={1} label="Booking steps" />
        <Card as="aside" className="flex flex-col gap-3">
          <SectionHeader size="card" title="Booking summary" />
          {appointment.service_image && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-crimson-light/15">
              <Image src={appointment.service_image} alt={appointment.service_name} fill sizes="100vw" className="object-cover" />
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
            {appointment.location_text && (
              <SummaryRow
                label="Location"
                value={
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

        <StickyActionBar>
          <Button onClick={goToPayment} className="w-full">
            Continue to payment
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </StickyActionBar>
      </div>
    </ClientScreen>
  );
}
