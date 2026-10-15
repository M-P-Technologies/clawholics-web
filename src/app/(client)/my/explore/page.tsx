"use client";

import { Button, Card, Select } from "@/components/atoms";
import { EmptyState, SearchBar, SectionHeader } from "@/components/molecules";
import ServicesTable from "@/components/features/client/explore/ServicesTable";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useExplore } from "@/hooks/client/useExplore";

export default function Explore() {
  const e = useExplore();

  return (
    <ClientScreen title="Our services">
      <Card className="flex flex-col gap-4">
        <SectionHeader size="section" title="Browse services" subtitle={e.subtitle} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <SearchBar value={e.q} onChange={e.setQ} />
          </div>
          <Select
            aria-label="Category"
            value={e.category}
            onChange={(event) => e.chooseCategory(event.target.value)}
            options={e.categoryOptions}
            className="w-full sm:w-56"
          />
        </div>
      </Card>

      <Card>
        {e.loadFailed ? (
          <EmptyState kind="error" title="We couldn't load the services." message="Please check your connection and try again.">
            <Button type="button" onClick={e.retry}>Try again</Button>
          </EmptyState>
        ) : e.results.length === 0 ? (
          <EmptyState kind="empty" title="No services match" message="Try another word or category.">
            <Button type="button" variant="secondary" onClick={e.clear}>Clear</Button>
          </EmptyState>
        ) : (
          <ServicesTable label="Services" services={e.results} onBook={e.book} />
        )}
      </Card>
    </ClientScreen>
  );
}
