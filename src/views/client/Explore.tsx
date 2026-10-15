"use client";

import { SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/atoms";
import { SearchBar } from "@/components/molecules";
import ServiceRow from "@/components/features/client/explore/ServiceRow";
import ClientTopBar from "@/components/features/client/shell/ClientTopBar";
import { useExplore } from "../../hooks/client/useExplore";

export default function Explore() {
  const e = useExplore();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-8 pt-4 lg:pt-8">
      <ClientTopBar title="Our services" />

      <div className="mt-4 rounded-3xl bg-crimson px-5 pb-14 pt-5 text-milk">
        <p className="text-milk/90">{e.subtitle}</p>
      </div>

      <div className="-mt-9 flex w-full flex-col gap-3 px-3">
        <SearchBar
          value={e.q}
          onChange={e.setQ}
          trailing={
              <button
                type="button"
                aria-label="Filter by category"
                aria-expanded={e.filterOpen}
                onClick={e.toggleFilter}
                className={clsx("flex h-10 w-10 items-center justify-center rounded-xl text-milk", e.category ? "bg-berry" : "bg-crimson")}
              >
                <SlidersHorizontal size={18} aria-hidden="true" />
              </button>
          }
        />

        {e.filterOpen && (
          <div className="flex flex-wrap gap-2">
            {e.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={e.category === c.name}
                onClick={() => e.setCategory(c.name)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-[13px] font-bold",
                  e.category === c.name ? "border-crimson bg-crimson text-milk" : "border-crimson-light bg-milk text-gray-red",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {e.category && !e.filterOpen && (
          <button type="button" onClick={() => e.setCategory(e.category)} className="flex w-fit items-center gap-1 rounded-full bg-crimson-light/40 px-3 py-1 text-[13px] font-bold text-berry">
            {e.category}
            <X size={14} aria-label="Remove filter" />
          </button>
        )}

        <section className="rounded-2xl bg-milk px-4 shadow-petal">
          {e.loadFailed ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p>We couldn&apos;t load the services.</p>
              <Button type="button" onClick={e.retry}>Try again</Button>
            </div>
          ) : e.results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p>No services match</p>
              <Button type="button" variant="secondary" onClick={e.clear}>Clear</Button>
            </div>
          ) : (
            <ul className="lg:grid lg:grid-cols-2 lg:gap-x-6">
              {e.results.map((service) => (
                <ServiceRow key={service.id} service={service} onBook={() => e.book(service)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
