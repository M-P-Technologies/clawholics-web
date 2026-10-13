"use client";

import { useAuth,useUser } from "@clerk/nextjs";
import { Plus as PlusIcon } from "lucide-react";
import { useEffect,useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import AppointmentDetailsModal from "../components/admin/AppointmentDetailsModal";
import AppointmentFilters, { SORT_OPTIONS, parseStatusParam } from "../components/admin/AppointmentFilters";
import { useSearchParams } from "@/lib/router";
import AppointmentRow from "../components/admin/AppointmentRow";
import CreateAppointmentModal from "../components/admin/CreateAppointmentModal";
import { LoadingBar } from "../components/ui/LoadingBar";
import { usePolling } from "../hooks/usePolling";

import {
matchesAppointmentFilter,
type AppointmentFilterStatus,
} from "../services/appointmentFilters";
import {
fetchAppointments,
updateAppointmentStatus,
type Appointment,
type AppointmentStatus,
} from "../services/appointmentService";

import { API_BASE_URL } from "../apiConfig";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import { useToast } from "../components/ui/ToastProvider";

interface NailArtist {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
}

const ROWS_PER_PAGE = 10;

const visibleStatuses: AppointmentStatus[] = [
  "PENDING",
  "AWAITING_PROOF",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export default function Appointments() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [artists, setArtists] = useState<NailArtist[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<AppointmentFilterStatus>(() => parseStatusParam(searchParams.get("status")));
  const [searchId, setSearchId] = useState("");
  const [filterBy, setFilterBy] = useState("All");
  const [sortBy, setSortBy] = useState("Upcoming First");
  const [showSlotTakenModal, setShowSlotTakenModal] = useState(false);
  const [slotTakenMessage, setSlotTakenMessage] = useState("");
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] =
    useState(false);
  const [visibleCount, setVisibleCount] = useState(ROWS_PER_PAGE);

  const [loading, setLoading] = useState(true);

  const loadAppointments = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const token = await getToken();

      const data = await fetchAppointments(visibleStatuses, token, currentUser?.id);

      setAppointments(
        data.filter((appointment) =>
          visibleStatuses.includes(
            appointment.status?.trim().toUpperCase() as AppointmentStatus,
          ),
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadArtists = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/nailists`, {
        headers: { "x-clawholics-origin": "frontend" }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch artists");
      }

      const data = await res.json();

      setArtists(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAppointments(true);
    loadArtists();
  }, []);

  // Refresh every 30 seconds, only while this tab is on screen
  usePolling(
    async () => {
      await loadAppointments(false);
    },
    { intervalMs: 30000, immediate: false },
  );

  useEffect(() => {
    setVisibleCount(ROWS_PER_PAGE);
  }, [statusFilter, searchId, filterBy, sortBy]);

  const handleStatusChange = async (
    id: number,
    status: AppointmentStatus
  ) => {
    try {
      const normalizedStatus =
        status.trim().toUpperCase() as AppointmentStatus;

      const token = await getToken();
      const updated = await updateAppointmentStatus(
        id,
        normalizedStatus,
        token,
        currentUser?.id
      );

      const updatedStatus =
        updated.status?.trim().toUpperCase() as AppointmentStatus;

      toast.show(
        "success",
        "Appointment updated",
        `Appointment #${id} is now ${updatedStatus.toLowerCase().replace(/_/g, " ")}.`,
      );

      setAppointments((prev) => {
        const shouldShowUpdated =
          visibleStatuses.includes(updatedStatus);

        const existingAppointments = prev.filter(
          (a) => a.id !== id
        );

        return shouldShowUpdated
          ? [...existingAppointments, updated]
          : existingAppointments;
      });

      if (!visibleStatuses.includes(updatedStatus)) {
        setSelectedAppointment(null);
        return;
      }

      if (!matchesAppointmentFilter(updated, statusFilter, Date.now())) {
        setSelectedAppointment(null);
        return;
      }

      if (selectedAppointment?.id === id) {
        setSelectedAppointment(updated);
      }
    } catch (err: any) {
      console.error(err);

      const message =
        err?.message ||
        "Unable to update appointment status.";

      if (
        message.includes("SLOT_TAKEN") ||
        message.includes("slot")
      ) {
        setSlotTakenMessage(
          "This appointment slot has already been taken by another active appointment."
        );

        setShowSlotTakenModal(true);

        return;
      }

      toast.show("error", "Status not changed", "The appointment status is unchanged. Please try again.");
    }
  };

  const getArtistName = (artist: NailArtist) => {
    return (
      artist.name ||
      `${artist.first_name ?? ""} ${artist.last_name ?? ""}`.trim()
    );
  };

  const getAppointmentDateTime = (a: Appointment) => {
    const time = new Date(
      `${a.appointment_date} ${a.appointment_time}`
    ).getTime();

    return Number.isNaN(time) ? 0 : time;
  };

  const getCreatedAtTime = (a: Appointment) => {
    if (!a.created_at) return 0;

    const time = new Date(a.created_at).getTime();

    return Number.isNaN(time) ? 0 : time;
  };

  const filteredAppointments = appointments
    .filter((a) => matchesAppointmentFilter(a, statusFilter, Date.now()))
    .filter((a) => (filterBy === "All" ? true : a.nailist_name === filterBy))
    .filter((a) => {
      const normalizedSearchId = searchId.trim();

      if (!normalizedSearchId) return true;

      return String(a.id).includes(normalizedSearchId);
    })
    .sort((a, b) => {
      if (sortBy === "Upcoming First") {
        return getAppointmentDateTime(a) - getAppointmentDateTime(b);
      }

      if (sortBy === "Latest First") {
        return getAppointmentDateTime(b) - getAppointmentDateTime(a);
      }

      if (sortBy === "Recently Booked") {
        return getCreatedAtTime(b) - getCreatedAtTime(a);
      }

      return getCreatedAtTime(a) - getCreatedAtTime(b);
    });

  const visibleAppointments = filteredAppointments.slice(0, visibleCount);

  const hasMoreAppointments = visibleCount < filteredAppointments.length;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading appointments" />
      </div>
    );
  }

  const artistNames = artists.map(getArtistName).filter((name): name is string => Boolean(name));

  return (
    <AdminShell
      title="Appointments"
      titleAside={
        <Button
          type="button"
          onClick={() => setShowCreateAppointmentModal(true)}
          className="hidden w-fit items-center gap-1.5 hover:opacity-90 lg:flex"
        >
          <PlusIcon size={14} className="text-light-orange" />
          <span className="text-[13px] font-semibold uppercase text-light-orange">Create Appointment</span>
        </Button>
      }
      actions={
        <div className="hidden h-5 items-center gap-2 lg:flex">
          <span className="text-[14px] text-gray-red">Sort by</span>
          <Select className="w-40" aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-2 md:gap-6">
        <AppointmentFilters
          status={statusFilter}
          onStatus={setStatusFilter}
          artist={filterBy}
          onArtist={setFilterBy}
          sort={sortBy}
          onSort={setSortBy}
          search={searchId}
          onSearch={setSearchId}
          artistNames={artistNames}
          onLoadArtists={loadArtists}
        />

        {filteredAppointments.length === 0 ? (
          <div className="rounded-2xl border border-crimson-light/40 bg-milk px-8 py-4 shadow-petal text-center text-sm font-medium text-gray-red">
            {statusFilter === "ALL"
              ? "No appointments found."
              : statusFilter === "PROOF_PENDING" || statusFilter === "PROOF_OVERDUE"
                ? "No appointments match this filter."
                : `No ${statusFilter.toLowerCase().replace(/_/g, " ")} appointments found.`}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleAppointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                onClick={() => setSelectedAppointment(appointment)}
                onStatusChange={handleStatusChange}
              />
            ))}

            {filteredAppointments.length > ROWS_PER_PAGE && (
              <div className="flex justify-center gap-4">
                {visibleCount > ROWS_PER_PAGE && (
                  <Button variant="secondary" type="button" onClick={() => setVisibleCount(ROWS_PER_PAGE)} className="hover:opacity-70">
                    Show Less
                  </Button>
                )}
                {hasMoreAppointments && (
                  <Button type="button" onClick={() => setVisibleCount((prev) => prev + ROWS_PER_PAGE)} className="hover:opacity-70">
                    Show More
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        aria-label="Create appointment"
        onClick={() => setShowCreateAppointmentModal(true)}
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full !p-0 shadow-lg shadow-crimson/30 lg:hidden"
      >
        <PlusIcon size={24} aria-hidden="true" />
      </Button>

      {showCreateAppointmentModal && (
        <CreateAppointmentModal
          onClose={() => setShowCreateAppointmentModal(false)}
          onCreated={() => {
            setShowCreateAppointmentModal(false);
            loadAppointments();
            toast.show("success", "Appointment created", "The walk-in appointment was added and now shows in the list.");
          }}
        />
      )}

      {showSlotTakenModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-red/40 px-4 drawer-backdrop max-sm:p-0">
          <div className="w-full max-w-[380px] rounded-2xl bg-milk px-8 py-4 shadow-lg drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none flex flex-col gap-4">
            <h3 className="text-center text-[20px] font-bold uppercase text-gray-red">
              Slot Already Taken
            </h3>

            <p className="text-center text-[14px] text-gray-red">
              {slotTakenMessage}
            </p>

            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => setShowSlotTakenModal(false)}
                className="hover:opacity-90"
              >
                Okay
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={handleStatusChange}
          tokenFetcher={getToken}
          clerkId={currentUser?.id}
          onProofReviewed={async () => {
            setSelectedAppointment(null);
            await loadAppointments();
          }}
        />
      )}
    </AdminShell>
  );
}
