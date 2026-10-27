"use client";

import clsx from "clsx";
import { Button, Card, Select } from "@/components/atoms";
import { SectionHeader, SegmentedControl } from "@/components/molecules";
import { FilterSheets } from "@/components/organisms";
import { surface } from "@/components/tokens";
import AppointmentDetails from "@/components/features/client/appointments/AppointmentDetails";
import AppointmentsTable from "@/components/features/client/appointments/AppointmentsTable";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useMyAppointments } from "@/hooks/client/useMyAppointments";
import { HISTORY_FILTERS, HISTORY_SORTS } from "@/lib/client/appointments";

export default function MyAppointments() {
  const { account: a, asTable, historyFilters, tab, setTab, tabs, views, selected, selectedRowId, reviewedIds, emptyText, tableLabel, openView } = useMyAppointments();

  return (
    <ClientScreen title="My appointments">
      {/* As in Explore: the list (2/3) and the chosen visit (1/3); below `lg` the panel is hidden and
          a visit opens in the drawer */}
      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-3">
      <Card as="section" aria-label="Appointments" padding="none" className="flex min-w-0 flex-col overflow-clip lg:col-span-2">
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-6">
          {/* The Upcoming | Past switch and, for past visits, the filters: one row from md, the filters in their own row below */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SegmentedControl label="Your visits" value={tab} onChange={setTab} options={tabs} className="w-fit shrink-0" />
            {tab === "past" &&
              (asTable ? (
                <div className="flex min-w-0 gap-3">
                  <Select aria-label="Filter past appointments" value={a.historyFilter} onChange={a.handleHistoryFilterChange} options={HISTORY_FILTERS} className="w-48 min-w-0" />
                  <Select aria-label="Sort past appointments" value={a.historySortBy} onChange={a.handleHistorySortChange} options={HISTORY_SORTS} className="w-56 min-w-0" />
                </div>
              ) : (
                // Phone: the two filters in one row, each opening its options in a bottom drawer
                <FilterSheets filters={historyFilters} />
              ))}
          </div>
          {a.appointmentsLoading ? (
              <p role="status" className={clsx(surface.tint, "px-3 py-6 text-center text-[13px] text-gray-red")}>Loading your appointments…</p>
            ) : views.length === 0 ? (
              <p className={clsx(surface.tint, "px-3 py-6 text-center text-[13px] text-gray-red")}>{emptyText}</p>
            ) : (
              <AppointmentsTable label={tableLabel} views={views} highlightedId={a.highlightedAppointmentId} reviewedIds={reviewedIds} onOpen={openView} selectedId={selectedRowId} />
            )}
            {tab === "past" && a.hasMoreHistory && (
              <Button type="button" variant="secondary" onClick={a.toggleHistory} className="w-full sm:w-auto sm:self-center">
                {a.showAllHistory ? "View less" : "View more"}
              </Button>
            )}
        </div>
      </Card>
      {selected && (
        // The chosen visit, as Explore shows the chosen service: the drawer's details and actions
        <div className="hidden lg:block lg:h-full">
          <Card as="aside" aria-label={`${selected.appt.service_name} details`} className="flex min-w-0 flex-col gap-3 lg:h-full">
            <SectionHeader size="card" title="Appointment" />
            <AppointmentDetails
              key={selected.appt.id}
              view={selected}
              now={a.currentTime}
              tokenFetcher={a.getToken}
              clerkId={a.clerkUser?.id}
              onPay={() => a.payForAppointment(selected.appt)}
              onReschedule={() => a.rescheduleAppointment(selected.appt)}
              onCancel={() => a.startCancel(selected.appt)}
              onProofUploaded={a.handleProofUploaded}
              review={a.reviews[selected.appt.id]}
              onSubmitReview={a.submitReview}
            />
          </Card>
        </div>
      )}
      </div>
    </ClientScreen>
  );
}
