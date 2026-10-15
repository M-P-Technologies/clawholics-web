"use client";

import clsx from "clsx";
import { Button, Card, Select } from "@/components/atoms";
import { TabSection, Tabs } from "@/components/molecules";
import { surface } from "@/components/tokens";
import AppointmentsTable from "@/components/features/client/appointments/AppointmentsTable";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useMyAppointments } from "@/hooks/client/useMyAppointments";
import { HISTORY_FILTERS, HISTORY_SORTS } from "@/lib/client/appointments";

export default function MyAppointments() {
  const { account: a, tab, setTab, tabs, views, reviewedIds, emptyText, tableLabel, openView } = useMyAppointments();

  return (
    <ClientScreen title="My appointments">
      <Card as="section" aria-label="Appointments" padding="none" className="flex min-w-0 flex-col overflow-clip">
        <Tabs label="Your visits" idPrefix="visits" value={tab} onChange={setTab} tabs={tabs} />
        <div role="tabpanel" id={`visits-panel-${tab}`} aria-labelledby={`visits-tab-${tab}`} className="flex min-w-0 flex-col gap-4 p-5">
          <TabSection title="Your visits" description="Open one to see its details, pay, reschedule, or leave a review after your visit.">
            {tab === "past" && (
              <div className="flex flex-wrap gap-2">
                <Select aria-label="Filter past appointments" value={a.historyFilter} onChange={a.handleHistoryFilterChange} options={HISTORY_FILTERS} className="w-full sm:w-48" />
                <Select aria-label="Sort past appointments" value={a.historySortBy} onChange={a.handleHistorySortChange} options={HISTORY_SORTS} className="w-full sm:w-56" />
              </div>
            )}
            {views.length === 0 ? (
              <p className={clsx(surface.tint, "px-4 py-6 text-center text-[13px] text-gray-red/70")}>{emptyText}</p>
            ) : (
              <AppointmentsTable label={tableLabel} views={views} highlightedId={a.highlightedAppointmentId} reviewedIds={reviewedIds} onOpen={openView} />
            )}
            {tab === "past" && a.hasMoreHistory && (
              <Button type="button" variant="secondary" onClick={a.toggleHistory} className="w-full sm:w-auto sm:self-center">
                {a.showAllHistory ? "View less" : "View more"}
              </Button>
            )}
          </TabSection>
        </div>
      </Card>
    </ClientScreen>
  );
}
