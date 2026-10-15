"use client";

import { SearchBar, SectionHeader } from "@/components/molecules";
import { Link } from "@/lib/router";
import NextAppointmentCard from "@/components/features/client/home/NextAppointmentCard";
import RewardsStrip from "@/components/features/client/home/RewardsStrip";
import OffersCarousel from "@/components/features/client/home/OffersCarousel";
import ServiceCard from "@/components/features/client/home/ServiceCard";
import ClientTopBar from "@/components/features/client/shell/ClientTopBar";
import { useClientHome } from "../../hooks/client/useClientHome";
import { CLIENT_PATHS } from "../../lib/client/clientNav";

export default function ClientHome() {
  const h = useClientHome();
  const hero = h.account.nextAppointment;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 pb-8 pt-4 lg:pt-8">
      <ClientTopBar title={h.firstName ? `Hi, ${h.firstName}` : "Hi there"} />

      <SearchBar value={h.query} onChange={h.setQuery} onSubmit={h.search} />

      <section aria-label="Popular services" className="flex flex-col gap-3">
        <SectionHeader size="section" title="Popular services" action={<Link to={CLIENT_PATHS.explore}>See all</Link>} />
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {h.popular.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      {h.offers.length > 0 && (
        <section aria-label="Special offers" className="flex flex-col gap-3">
          <SectionHeader size="section" title="Special offers" />
          <OffersCarousel offers={h.offers} />
        </section>
      )}

      <section aria-label="Upcoming appointment" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="flex flex-col gap-3">
          <SectionHeader size="section" title="Upcoming appointment" action={<Link to={CLIENT_PATHS.appointments}>See all</Link>} />
          <NextAppointmentCard
            view={hero}
            photo={hero ? h.photoFor(hero.appt.service_name) : ""}
            now={h.account.currentTime}
            bookTo={CLIENT_PATHS.explore}
            onPay={() => hero && h.account.payForAppointment(hero.appt)}
            onReschedule={() => hero && h.account.rescheduleAppointment(hero.appt)}
            onCancel={() => hero && h.account.startCancel(hero.appt)}
          />
        </div>
        <div className="flex flex-col gap-3">
          <SectionHeader size="section" title="Loyalty card" />
          <RewardsStrip stamps={h.account.stamps} onOpen={h.account.openRewards} />
        </div>
      </section>
    </div>
  );
}
