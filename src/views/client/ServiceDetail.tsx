"use client";

import { ArrowLeft, Clock, Gem, Sparkles, UsersRound } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { Button } from "@/components/atoms";
import { LoadingBar } from "@/components/atoms";
import { useServiceDetail } from "../../hooks/client/useServiceDetail";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { artistsFact, priceLabel } from "../../lib/client/servicePrice";

export default function ServiceDetail() {
  const d = useServiceDetail();
  const navigate = useNavigate();
  const back = (
    <Button
      variant="bare"
      type="button"
      aria-label="Back"
      onClick={() => navigate(CLIENT_PATHS.explore)}
      className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-milk/90 text-gray-red shadow-petal lg:left-8 lg:top-12"
    >
      <ArrowLeft size={18} aria-hidden="true" />
    </Button>
  );

  if (d.status === "loading") return <LoadingBar label="Loading the service" />;

  if (d.status !== "ready" || !d.service) {
    return (
      <div className="relative flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        {back}
        <p>{d.status === "missing" ? "This service isn't available any more." : "We couldn't load this service."}</p>
        {d.status === "error" ? <Button type="button" onClick={d.retry}>Try again</Button> : <Button to={CLIENT_PATHS.explore}>See all services</Button>}
      </div>
    );
  }

  const s = d.service;
  const facts = [
    { Icon: Clock, value: s.duration || "Ask us", label: "Duration" },
    { Icon: UsersRound, value: artistsFact(s), label: "Artists" },
    { Icon: Gem, value: "Premium", label: "Products" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-4xl lg:px-4 lg:pt-8">
      {back}
      <div className="flex h-[45vh] snap-x snap-mandatory overflow-x-auto bg-crimson-light/40 [scrollbar-width:none] lg:h-96 lg:rounded-3xl [&::-webkit-scrollbar]:hidden">
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

      <article className="relative -mt-8 flex flex-col gap-5 rounded-t-3xl bg-milk px-5 pb-28 pt-6 lg:mt-6 lg:rounded-3xl lg:pb-6 lg:shadow-petal">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-normal normal-case tracking-normal text-gray-red">{s.name}</h1>
          <span className="shrink-0 text-lg font-bold text-berry">{priceLabel(s)}</span>
        </div>

        <ul className="grid grid-cols-3 gap-2 border-y border-crimson-light/50 py-4 text-center">
          {facts.map((f) => (
            <li key={f.label} className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-crimson-light/30 text-crimson">
                <f.Icon size={18} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-gray-red">{f.value}</span>
              <span className="text-[12px] text-gray-red/70">{f.label}</span>
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold normal-case tracking-normal text-gray-red">About this service</h2>
          <p className="text-sm leading-relaxed text-gray-red/80">{s.description}</p>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 bg-milk/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:static lg:bg-transparent lg:p-0">
          <Button type="button" onClick={d.book} className="w-full">Book now</Button>
        </div>
      </article>
    </div>
  );
}
