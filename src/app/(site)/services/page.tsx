"use client";

import { Clock } from "lucide-react";
import CtaBand from "@/components/home/CtaBand";
import ImageCard from "@/components/home/ImageCard";
import { Button, LoadingBar } from "@/components/atoms";
import { LoadError, SectionHeader, SegmentedControl, Pagination, EmptyState, SearchBar } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import { servicePath } from "@/utils/slug";
import { useServices } from "@/hooks/useServices";

export default function Services() {
  const { setSearch, resetFilters, cards, error, reload, content, banner, primary, secondary, category, setCategory, search, categoryOptions, page, totalPages, pageItems, listRef, goToPage, emptyMessage } = useServices();

  if (error && !content) return <LoadError what="services" onRetry={reload} />;
  if (!content) return <LoadingBar label="Loading services" />;

  return (
    <PageShell>
      <Section>
        <SectionHeader title={banner.home_services_title} subtitle={content.home_services_subtitle}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* CATEGORY FILTERS: the admin's pill switch, scrolling sideways when there are many */}
            <div className="min-w-0 overflow-x-auto pb-1">
              <SegmentedControl label="Service category" options={categoryOptions} value={category} onChange={setCategory} className="w-max" />
            </div>

            {/* SEARCH */}
            <div className="w-full lg:max-w-xs">
              <SearchBar look="outline" value={search} onChange={setSearch} />
            </div>
          </div>
        </SectionHeader>

        <section
          ref={listRef}
          aria-label="Available nail services"
          className="flex min-h-[30vh] scroll-mt-24 flex-col items-center justify-start gap-3 md:gap-6"
        >
          {cards.length === 0 ? (
            <EmptyState
              kind="empty"
              title="No services found"
              message={emptyMessage}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={resetFilters}
                
              >
                Show all services
              </Button>
            </EmptyState>
          ) : (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {pageItems.map((s, index) => (
                <ImageCard
                  key={s.id}
                  priority={index === 0}
                  image={s.image}
                  imageAlt={`${s.name} nail service sample`}
                  aspect="aspect-4/3"
                  title={s.name}
                  subtitle={
                    <div className="flex items-center justify-between gap-3">
                      <span>{s.priceLabel}</span>
                      <span className="inline-flex items-center gap-1.5 font-normal text-gray-red">
                        <Clock size={16} aria-hidden="true" focusable="false" />
                        {s.duration}
                      </span>
                    </div>
                  }
                  description={s.description}
                  footer={
                    <Button to={servicePath(s)}>
                      Learn more<span className="sr-only"> about {s.name}</span>
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
          primary={primary}
          secondary={secondary}
        />
      </div>
    </PageShell>
  );
}
