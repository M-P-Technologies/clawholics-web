"use client";

import clsx from "clsx";
import { Button, Card, Select } from "@/components/atoms";
import { TabSection, Tabs } from "@/components/molecules";
import { surface } from "@/components/tokens";
import AppointmentsTable from "@/components/features/client/appointments/AppointmentsTable";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useMyAccount } from "../../hooks/client/useMyAccount";
import { useAppointmentsTab } from "../../hooks/client/useAppointmentsTab";

export default function MyAppointments() {
  const a = useMyAccount();
  const { tab, setTab } = useAppointmentsTab();
  const reviewedIds = new Set(Object.keys(a.reviews).map(Number));
  const views = tab === "upcoming" ? a.upcoming : a.pastViews;

  return (
    <ClientScreen title="My appointments">
      <Card as="section" aria-label="Appointments" padding="none" className="flex min-w-0 flex-col overflow-clip">
        <Tabs
          label="Your visits"
          idPrefix="visits"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "upcoming", label: "Upcoming", count: a.upcoming.length },
            { value: "past", label: "Past", count: a.pastViews.length },
          ]}
        />
        <div role="tabpanel" id={`visits-panel-${tab}`} aria-labelledby={`visits-tab-${tab}`} className="flex min-w-0 flex-col gap-4 p-5">
          <TabSection title="Your visits" description="Open one to see its details, pay, reschedule, or leave a review after your visit.">
            {tab === "past" && (
              <div className="flex flex-wrap gap-2">
                <Select aria-label="Filter past appointments" value={a.historyFilter} onChange={a.handleHistoryFilterChange} className="w-full sm:w-48">
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </Select>
                <Select aria-label="Sort past appointments" value={a.historySortBy} onChange={a.handleHistorySortChange} className="w-full sm:w-56">
                  <option value="appointmentDateDesc">Appt Date (Newest)</option>
                  <option value="appointmentDateAsc">Appt Date (Oldest)</option>
                  <option value="bookingDateDesc">Recently Booked</option>
                </Select>
              </div>
            )}
            {views.length === 0 ? (
              <p className={clsx(surface.tint, "px-4 py-6 text-center text-[13px] text-gray-red/70")}>
                {tab === "upcoming" ? "Nothing coming up yet." : "No past appointments to show."}
              </p>
            ) : (
              <AppointmentsTable
                label={tab === "upcoming" ? "Upcoming appointments" : "Past appointments"}
                views={views}
                highlightedId={a.highlightedAppointmentId}
                reviewedIds={reviewedIds}
                onOpen={(view) => a.openAppointment(view.appt.id)}
              />
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
