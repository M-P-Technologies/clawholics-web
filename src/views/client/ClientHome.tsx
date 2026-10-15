"use client";

import { CalendarCheck, CalendarClock, Stamp } from "lucide-react";
import { Badge, Button, Card } from "@/components/atoms";
import { SearchBar, SectionHeader, StatCard, StepTracker, SummaryRow } from "@/components/molecules";
import { Link } from "@/lib/router";
import OffersCarousel from "@/components/features/client/home/OffersCarousel";
import ServicesTable from "@/components/features/client/explore/ServicesTable";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useClientHome } from "../../hooks/client/useClientHome";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { statusDotTone } from "../../utils/profileView";

export default function ClientHome() {
  const h = useClientHome();
  const next = h.account.nextAppointment;

  return (
    <ClientScreen title={h.firstName ? `Hi, ${h.firstName}` : "Hi there"}>
      <SearchBar value={h.query} onChange={h.setQuery} onSubmit={h.search} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard size="compact" icon={CalendarClock} label="Next visit" value={h.nextVisitLabel} />
        <StatCard size="compact" icon={Stamp} label="Loyalty stamps" value={`${h.account.stamps} / 10`} />
        <StatCard size="compact" icon={CalendarCheck} label="Visits" value={String(h.visits)} hint="completed" />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card as="section" aria-label="Upcoming appointment" className="flex flex-col gap-4">
          <SectionHeader size="section" title="Upcoming appointment" action={<Link to={CLIENT_PATHS.appointments}>See all</Link>} />
          {next ? (
            <>
              <dl className="flex flex-col">
                <SummaryRow label="Service" value={next.appt.service_name} />
                <SummaryRow label="Artist" value={next.appt.nailist_name} />
                <SummaryRow label="Date" value={next.dateLabel} />
                <SummaryRow label="Time" value={next.timeLabel} />
                <SummaryRow label="Status" value={<Badge dot={statusDotTone(next.displayStatus)} caps>{next.statusLabel}</Badge>} />
              </dl>
              {h.nextWhen && <p className="text-sm font-bold text-berry">{h.nextWhen}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                {next.canPay ? (
                  <Button type="button" onClick={() => h.account.payForAppointment(next.appt)} className="w-full sm:w-auto">Complete payment</Button>
                ) : (
                  (next.canReschedule || next.isLocked) && (
                    <Button type="button" onClick={() => h.account.rescheduleAppointment(next.appt)} disabled={!next.canReschedule} className="w-full sm:w-auto">
                      Reschedule
                    </Button>
                  )
                )}
                {next.canCancel && (
                  <Button type="button" variant="secondary" onClick={() => h.account.startCancel(next.appt)} className="w-full sm:w-auto">Cancel</Button>
                )}
              </div>
              {next.isLocked && <p className="text-[13px] text-gray-red/70">Changes close 3 days before your appointment.</p>}
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-gray-red/80">You have no upcoming appointments.</p>
              <Button to={CLIENT_PATHS.explore}>Book now</Button>
            </div>
          )}
        </Card>

        {next && (
          <Card as="section" aria-label="Where your booking is" className="flex flex-col gap-4">
            <SectionHeader size="card" title="Where your booking is" />
            <StepTracker label="Booking progress" steps={h.trackerSteps} />
          </Card>
        )}
      </div>

      <Card as="section" aria-label="Popular services" className="flex flex-col gap-4">
        <SectionHeader size="section" title="Popular services" action={<Link to={CLIENT_PATHS.explore}>See all</Link>} />
        <ServicesTable label="Popular services" services={h.popular} onBook={h.book} />
      </Card>

      {h.offers.length > 0 && (
        <Card as="section" aria-label="Special offers" className="flex flex-col gap-4">
          <SectionHeader size="section" title="Special offers" />
          <OffersCarousel offers={h.offers} />
        </Card>
      )}
    </ClientScreen>
  );
}
