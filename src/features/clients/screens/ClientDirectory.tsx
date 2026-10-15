"use client";

import AdminShell from "../../../components/layout/admin/AdminShell";
import AppointmentsTable from "../../appointments/components/AppointmentsTable";
import DirectoryStats from "../components/DirectoryStats";
import DirectoryTable from "../../admins/components/DirectoryTable";
import { ListSkeleton } from "../../../components/shared/ListSkeleton";
import { useClientDirectory } from "../hooks/useClientDirectory";
import { Link, useNavigate } from "../../../lib/router";

// Clients & Bookings: the client totals, then every appointment with its client's details
// (photo, email, phone, joined, last active, visits). Opened from the dashboard's warm leads
// (?view=leads), it also lists those clients, who have no appointments to show yet. Its data is
// in hooks/useClientDirectory.
export default function ClientDirectory() {
  const directory = useClientDirectory();
  const navigate = useNavigate();
  const { leads } = directory;

  return (
    <AdminShell title="Clients & Bookings">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-2">
        {!directory.usersFailed && <DirectoryStats label="Client totals" stats={directory.stats} />}

        {directory.leadsView && (
          <section aria-label="Warm leads" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-crimson-light/40 bg-milk px-4 py-3 text-sm text-gray-red shadow-petal">
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
                onSelect={(user) => user.user_id && navigate(`/clients/${user.user_id}`)}
                showVisits
              />
            )}
            {directory.leadsLoaded && leads.length === 0 && !directory.leadsFailed && <p className="text-sm text-gray-red/70">No warm leads right now.</p>}
          </section>
        )}

        <AppointmentsTable clients={directory.profilesByUserId} />
      </div>
    </AdminShell>
  );
}
