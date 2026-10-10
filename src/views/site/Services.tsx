"use client";

import { Clock } from "lucide-react";
import { FACEBOOK_URL } from "../../data/home";
import CtaBand from "../../components/home/CtaBand";
import ImageCard from "../../components/home/ImageCard";
import Button from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import LoadError from "../../components/ui/LoadError";
import PageHeader from "../../components/layout/PageHeader";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import StatePanel from "../../components/ui/StatePanel";
import { chipClass,inputClass } from "../../components/ui/styles";
import { useServices } from "../../hooks/useServices";

export default function Services() {
  const { resetFilters, cards, error, reload, content, category, setCategory, search, categoryNames, handleSearchChange } = useServices();

  if (error && !content) return <LoadError what="services" onRetry={reload} />;
  if (!content) return <LoadingBar label="Loading services" />;

  return (
    <PageShell>
      <Section>
        <PageHeader title="Nail services" subtitle={content.home_services_subtitle}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* CATEGORY FILTERS */}
            <div className="flex flex-wrap gap-4">
              {categoryNames.map((cat) => (
                <Button
                  variant="bare"
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={chipClass(category === cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* SEARCH */}
            <label htmlFor="service-search" className="sr-only">
              Search services
            </label>
            <input
              id="service-search"
              type="search"
              placeholder="Search services"
              value={search}
              onChange={handleSearchChange}
              className={`${inputClass} lg:max-w-xs`}
            />
          </div>
        </PageHeader>

        <section
          aria-label="Available nail services"
          className="flex min-h-[30vh] items-start justify-center"
        >
          {cards.length === 0 ? (
            <StatePanel
              kind="empty"
              title="No services found"
              message={
                search.trim()
                  ? `Nothing matches "${search.trim()}". Check the spelling, try a shorter word, or clear the search to see everything.`
                  : "There are no services in this category yet. Pick another category to keep browsing."
              }
            >
              <Button
                variant="secondary"
                type="button"
                onClick={resetFilters}
                
              >
                Show all services
              </Button>
            </StatePanel>
          ) : (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {cards.map((s) => (
                <ImageCard
                  key={s.id}
                  image={s.image}
                  imageAlt={`${s.name} nail service sample`}
                  aspect="aspect-4/3"
                  title={s.name}
                  subtitle={
                    <div className="flex items-center justify-between gap-4">
                      <span>{s.priceLabel}</span>
                      <span className="inline-flex items-center gap-1.5 font-normal text-gray-red/80">
                        <Clock size={16} aria-hidden="true" focusable="false" />
                        {s.duration}
                      </span>
                    </div>
                  }
                  description={s.description}
                  footer={
                    <Button to={`/appointment/${s.id}`} aria-label={`View details for ${s.name}`}>
                      Learn more
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </Section>

      <CtaBand
        title="Not sure what to get?"
        text="Talk to our support or ask one of our artists. They will help you pick the right set."
        primary={{ href: FACEBOOK_URL, label: "Talk to support" }}
        secondary={{ to: "/team", label: "Meet our artists" }}
      />
    </PageShell>
  );
}
