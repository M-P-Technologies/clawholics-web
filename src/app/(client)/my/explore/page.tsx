"use client";

import { Button, Card, Select } from "@/components/atoms";
import { EmptyState, SearchBar } from "@/components/molecules";
import { Dialog } from "@/components/organisms";
import ServicePanel from "@/components/features/client/explore/ServicePanel";
import ServicesTable from "@/components/features/client/explore/ServicesTable";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { RowsSkeleton } from "@/components/features/client/skeletons/skeletons";
import { useExplore } from "@/hooks/client/useExplore";

export default function Explore() {
  const e = useExplore();

  return (
    <ClientScreen title="Our services">
      {/* As in the Admin Directory: the list (2/3) and the chosen service (1/3); below `lg` the panel
          is hidden and a clicked row opens the service in a bottom sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
      <Card className="flex min-w-0 flex-col gap-3 lg:col-span-2">
        {/* The search and category sit on the list they filter (kept when nothing matches, to change them) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Like the admin search: full width on phones, at most w-72 from sm */}
          <div className="min-w-0 flex-1 sm:max-w-72">
            <SearchBar look="outline" value={e.q} onChange={e.setQ} />
          </div>
          <Select
            aria-label="Category"
            value={e.category}
            onChange={(event) => e.chooseCategory(event.target.value)}
            options={e.categoryOptions}
            className="w-full sm:w-56"
          />
        </div>

        {e.loading ? (
          <RowsSkeleton label="Loading services" rows={5} />
        ) : e.loadFailed ? (
          <EmptyState kind="error" title="We couldn't load the services." message="Please check your connection and try again.">
            <Button type="button" onClick={e.retry}>Try again</Button>
          </EmptyState>
        ) : e.results.length === 0 ? (
          <EmptyState kind="empty" title="No services match" message="Try another word or category.">
            <Button type="button" variant="secondary" onClick={e.clear}>Clear</Button>
          </EmptyState>
        ) : (
          <ServicesTable label="Services" services={e.results} onBook={e.book} paginateTable onSelect={e.select} selectedId={e.selected?.id ?? null} />
        )}
      </Card>
      {e.selected && (
        <div className="hidden lg:block lg:h-full">
          <ServicePanel key={e.selected.id} service={e.selected} onBook={e.book} />
        </div>
      )}
      </div>

      {e.selected && (
        <Dialog
          open={e.sheetOpen}
          onClose={e.closeSheet}
          title="Service details"
          footer={<Button type="button" onClick={() => e.book(e.selected!)} className="w-full">Book now</Button>}
        >
          <ServicePanel key={e.selected.id} service={e.selected} onBook={e.book} inSheet />
        </Dialog>
      )}
    </ClientScreen>
  );
}
