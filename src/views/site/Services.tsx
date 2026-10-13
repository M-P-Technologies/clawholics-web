"use client";

import { useRef } from "react";
import { Clock } from "lucide-react";
import { ctaLink, readServicesPage } from "../../lib/homeSections";
import CtaBand from "../../components/home/CtaBand";
import ImageCard from "../../components/home/ImageCard";
import Button from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import LoadError from "../../components/ui/LoadError";
import PageHeader from "../../components/layout/PageHeader";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import Pagination from "../../components/ui/Pagination";
import StatePanel from "../../components/ui/StatePanel";
import { chipClass,inputClass } from "../../components/ui/styles";
import { usePagination } from "../../hooks/usePagination";
import { servicePath } from "../../utils/slug";
import { useServices } from "../../hooks/useServices";

export default function Services() {
  const { resetFilters, cards, error, reload, content, category, setCategory, search, categoryNames, handleSearchChange } = useServices();
  const banner = readServicesPage(content);
  // 9 services a page; a new category or search starts again from the first page
  const { page, setPage, totalPages, pageItems } = usePagination(cards, `${category}|${search}`);
  const listRef = useRef<HTMLElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (error && !content) return <LoadError what="services" onRetry={reload} />;
  if (!content) return <LoadingBar label="Loading services" />;

  return (
    <PageShell>
      <Section>
        <PageHeader title={banner.home_services_title} subtitle={content.home_services_subtitle}>
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
          ref={listRef}
          aria-label="Available nail services"
          className="flex min-h-[30vh] scroll-mt-24 flex-col items-center justify-start gap-4 md:gap-8"
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
              {pageItems.map((s) => (
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
                    <Button to={servicePath(s)} aria-label={`View details for ${s.name}`}>
                      Learn more
                    </Button>
                  }
                />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </section>
      </Section>

      {/* As edited in Admin > Services (or the defaults) */}
      <div id="services-banner">
        <CtaBand
          title={banner.home_services_cta_title}
          text={banner.home_services_cta_text}
          primary={ctaLink(banner.home_services_cta_primary_link, banner.home_services_cta_primary_label)}
          secondary={ctaLink(banner.home_services_cta_secondary_link, banner.home_services_cta_secondary_label)}
        />
      </div>
    </PageShell>
  );
}
