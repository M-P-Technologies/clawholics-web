"use client";

import { Clock, Gem, Sparkles, UsersRound } from "lucide-react";
import { Button, Card, LoadingBar } from "@/components/atoms";
import { EmptyState, SectionHeader, StatCard } from "@/components/molecules";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useServiceDetail } from "../../hooks/client/useServiceDetail";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { artistsFact, priceLabel } from "../../lib/client/servicePrice";

export default function ServiceDetail() {
  const d = useServiceDetail();

  if (d.status === "loading") return <LoadingBar label="Loading the service" />;

  if (d.status !== "ready" || !d.service) {
    return (
      <ClientScreen title="Service" back={CLIENT_PATHS.explore}>
        <Card>
          <EmptyState
            kind={d.status === "error" ? "error" : "info"}
            title={d.status === "missing" ? "This service isn't available any more." : "We couldn't load this service."}
          >
            {d.status === "error" ? <Button type="button" onClick={d.retry}>Try again</Button> : <Button to={CLIENT_PATHS.explore}>See all services</Button>}
          </EmptyState>
        </Card>
      </ClientScreen>
    );
  }

  const s = d.service;

  return (
    <ClientScreen title={s.name} back={CLIENT_PATHS.explore}>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex h-[40vh] snap-x snap-mandatory overflow-x-auto rounded-2xl bg-crimson-light/40 shadow-petal [scrollbar-width:none] lg:h-[28rem] [&::-webkit-scrollbar]:hidden">
          {d.photos.length ? (
            d.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS
              <img key={url} src={url} alt="" className="h-full w-full shrink-0 snap-center object-cover" />
            ))
          ) : (
            <span className="flex h-full w-full items-center justify-center text-crimson">
              <Sparkles size={48} aria-hidden="true" />
            </span>
          )}
        </div>

        <Card as="article" className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-gray-red/70">Price</span>
            <span className="font-display text-2xl text-berry">{priceLabel(s)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard size="compact" icon={Clock} label="Duration" value={s.duration || "Ask us"} />
            <StatCard size="compact" icon={UsersRound} label="Artists" value={artistsFact(s)} />
            <StatCard size="compact" icon={Gem} label="Products" value="Premium" />
          </div>

          <section className="flex flex-col gap-2">
            <SectionHeader size="label" title="About this service" />
            <p className="text-sm leading-relaxed text-gray-red/80">{s.description}</p>
          </section>

          <Button type="button" onClick={d.book} className="w-full">Book now</Button>
        </Card>
      </div>
    </ClientScreen>
  );
}
