"use client";

import { Cake, CalendarCheck, CalendarClock, Stamp } from "lucide-react";
import { Badge, Button, Card } from "@/components/atoms";
import { SectionHeader, StatCard, StepTracker, SummaryRow } from "@/components/molecules";
import { Link } from "@/lib/router";
import ServicesTable from "@/components/features/client/explore/ServicesTable";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useClientHome } from "@/hooks/client/useClientHome";
import { CLIENT_PATHS } from "@/lib/client/clientNav";

export default function ClientHome() {
  const h = useClientHome();
  const { next } = h;

  return (
    <ClientScreen title={h.greeting}>
      {/* The client's birthday voucher: claim it, or (once claimed) its code */}
      {h.birthdayVoucher && (
        <section aria-label="Your birthday voucher" className="flex flex-col gap-3 rounded-xl border border-crimson bg-crimson-light/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cake size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-berry" />
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-lg leading-tight text-berry">Happy birthday! {h.birthdayVoucher.discount_pct}% off this month</h3>
              {h.voucherClaimed ? (
                <p className="text-[13px] text-gray-red">
                  Your code: <strong className="font-mono tracking-wider text-berry">{h.birthdayVoucher.code}</strong>. {h.voucherHint} Valid until {h.voucherUntil}.
                </p>
              ) : (
                <p className="text-[13px] text-gray-red">A treat from us for your birthday month. Claim it before {h.voucherUntil}.</p>
              )}
              {h.voucherError && <p role="alert" className="text-[13px] text-danger-ink">{h.voucherError}</p>}
            </div>
          </div>
          {!h.voucherClaimed && (
            <Button type="button" onClick={h.claimVoucher} loading={h.claimingVoucher} loadingText="Claiming..." className="shrink-0">
              {`Claim ${h.birthdayVoucher.discount_pct}% off`}
            </Button>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <StatCard icon={CalendarClock} label="Next visit" value={h.nextVisitLabel} className="col-span-2 lg:col-span-1" />
        <StatCard icon={Stamp} label="Loyalty stamps" value={h.stampsValue} />
        <StatCard icon={CalendarCheck} label="Visits" value={String(h.visits)} hint="completed" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        <Card as="section" aria-label="Upcoming appointment" className={`flex flex-col gap-3 ${next ? "" : "lg:col-span-2"}`}>
          <SectionHeader size="section" title="Upcoming appointment" action={<Link to={CLIENT_PATHS.appointments}>See all</Link>} />
          {next ? (
            <>
              <dl className="flex flex-col">
                <SummaryRow label="Service" value={next.appt.service_name} />
                <SummaryRow label="Artist" value={next.appt.nailist_name} />
                <SummaryRow label="Date" value={next.dateLabel} />
                <SummaryRow label="Time" value={next.timeLabel} />
                <SummaryRow label="Status" value={<Badge dot={h.nextStatusTone} caps>{next.statusLabel}</Badge>} />
              </dl>
              {h.nextWhen && <p className="text-sm font-bold text-berry">{h.nextWhen}</p>}
              <div className="flex flex-wrap gap-3">
                {next.canPay ? (
                  <Button type="button" onClick={() => h.account.payForAppointment(next.appt)} className="grow sm:grow-0">Complete payment</Button>
                ) : (
                  (next.canReschedule || next.isLocked) && (
                    <Button type="button" onClick={() => h.account.rescheduleAppointment(next.appt)} disabled={!next.canReschedule} className="grow sm:grow-0">
                      Reschedule
                    </Button>
                  )
                )}
                {next.canCancel && (
                  <Button type="button" variant="secondary" onClick={() => h.account.startCancel(next.appt)} className="grow sm:grow-0">Cancel</Button>
                )}
              </div>
              {next.isLocked && <p className="text-[13px] text-gray-red">Changes close 3 days before your appointment.</p>}
            </>
          ) : h.account.appointmentsLoading ? (
            <p role="status" className="text-sm text-gray-red">Loading your appointments…</p>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-gray-red">You have no upcoming appointments.</p>
              <Button to={CLIENT_PATHS.explore}>Book now</Button>
            </div>
          )}
        </Card>

        {next && (
          <Card as="section" aria-label="Where your booking is" className="flex flex-col gap-3">
            <SectionHeader size="card" title="Where your booking is" />
            <StepTracker label="Booking progress" steps={h.trackerSteps} />
          </Card>
        )}
      </div>

      <Card as="section" aria-label="Popular services" className="flex flex-col gap-3">
        <SectionHeader size="section" title="Popular services" action={<Link to={CLIENT_PATHS.explore}>See all</Link>} />
        <ServicesTable label="Popular services" services={h.popular} onBook={h.book} paginateTable rowsPerPage={5} />
      </Card>

      {h.offers.length > 0 && (
        <Card as="section" aria-label="Special offers" className="flex flex-col gap-3">
          <SectionHeader size="section" title="Special offers" />
          {/* One banner per view on a phone (swipe for more), two side by side on a computer */}
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none lg:grid lg:grid-cols-2 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {h.offers.map((offer) => (
              <article key={offer.key} className="relative flex min-h-40 w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl bg-crimson text-on-crimson shadow-petal lg:w-auto">
                <div className="relative z-10 flex flex-1 flex-col items-start gap-1.5 p-6">
                  {offer.birthday && <Cake size={22} aria-hidden="true" />}
                  <h3 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-on-crimson">{offer.title}</h3>
                  {offer.line && <p className="text-sm text-on-crimson">{offer.line}</p>}
                  {offer.note && <p className="text-xs text-on-crimson">{offer.note}</p>}
                  {offer.buttonLabel && (
                    <Button variant="bare" to={offer.to} href={offer.href} className="mt-auto rounded-lg bg-milk px-3 py-1.5 text-[13px] font-bold text-crimson-ink">
                      {offer.buttonLabel}
                    </Button>
                  )}
                </div>
                {offer.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS
                  <img src={offer.image} alt="" className="w-2/5 shrink-0 object-cover" />
                )}
              </article>
            ))}
          </div>
        </Card>
      )}
    </ClientScreen>
  );
}
