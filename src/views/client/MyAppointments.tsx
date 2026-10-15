"use client";

import AppointmentsSection from "@/components/features/client/appointments/AppointmentsSection";
import { TabSection } from "@/components/molecules";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useMyAccount } from "../../hooks/client/useMyAccount";
import { useServicePhotos } from "../../hooks/useServicePhotos";

export default function MyAppointments() {
  const a = useMyAccount();
  const photoFor = useServicePhotos();
  const reviewedIds = new Set(Object.keys(a.reviews).map(Number));

  return (
    <ClientScreen title="My appointments">
      <div className="rounded-2xl bg-milk p-5 shadow-petal">
        <TabSection title="Your visits" description="Open one to see its details, pay, reschedule, or leave a review after your visit.">
          <AppointmentsSection
            upcoming={a.upcoming}
            past={a.pastViews}
            photoFor={photoFor}
            highlightedId={a.highlightedAppointmentId}
            onOpen={(view) => a.openAppointment(view.appt.id)}
            historyFilter={a.historyFilter}
            onFilterChange={a.handleHistoryFilterChange}
            historySort={a.historySortBy}
            onSortChange={a.handleHistorySortChange}
            hasMore={a.hasMoreHistory}
            showAll={a.showAllHistory}
            onToggleAll={a.toggleHistory}
            reviewedIds={reviewedIds}
          />
        </TabSection>
      </div>
    </ClientScreen>
  );
}
