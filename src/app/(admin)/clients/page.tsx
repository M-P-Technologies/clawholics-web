"use client";

import { Suspense } from "react";
import AdminShell from "@/components/features/admin/shell/AdminShell";
import AppointmentsTable from "@/components/features/admin/bookings/AppointmentsTable";
import DirectoryStats from "@/components/features/admin/directory/DirectoryStats";
import DirectoryTable from "@/components/features/admin/directory/DirectoryTable";
import { ListSkeleton } from "@/components/features/admin/skeletons/ListSkeleton";
import { useClientDirectory } from "@/hooks/admin/useClientDirectory";
import { Link } from "@/lib/router";

// Clients & Bookings: the client totals, then every appointment with its client's details
// (photo, email, phone, joined, last active, visits). Opened from the dashboard's warm leads
// (?view=leads), it also lists those clients, who have no appointments to show yet. Its data is
// in hooks/admin/useClientDirectory.
function ClientDirectory() {
  const directory = useClientDirectory();
  const { leads } = directory;

  return (
    <AdminShell title="Clients & Bookings">
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-6 overflow-y-auto pb-2">
        {!directory.usersFailed && <DirectoryStats label="Client totals" stats={directory.stats} />}

        {directory.leadsView && (
          <section aria-label="Warm leads" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-crimson-light/40 bg-milk px-3 py-3 text-sm text-gray-red shadow-petal">
              <p>{directory.leadsMessage}</p>
              <Link to="/clients" className="font-bold text-berry underline underline-offset-4">
                Back to the appointments
              </Link>
            </div>
            {directory.leadsLoading && <ListSkeleton label="Loading warm leads" quiet />}
            {leads.length > 0 && (
              <DirectoryTable
                label="Warm leads"
                users={leads}
                profiles={directory.profiles}
                selectedId={null}
                onSelect={directory.openLead}
                showVisits
              />
            )}
            {directory.leadsLoaded && leads.length === 0 && !directory.leadsFailed && <p className="text-sm text-gray-red">No warm leads right now.</p>}
          </section>
        )}

        <AppointmentsTable clients={directory.profilesByUserId} />
      </div>
    </AdminShell>
  );
}

// Suspense: the screen reads ?view=leads and ?status=
export default function Page() {
  return (
    <Suspense>
      <ClientDirectory />
    </Suspense>
  );
}
