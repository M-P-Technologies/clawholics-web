"use client";

import { useAuth,useUser } from "@clerk/nextjs";
import { Plus as PlusIcon } from "lucide-react";
import { useEffect,useState } from "react";
import AS_AppointmentDetailsModal from "../components/admin/AS_AppointmentDetailsModal";
import AppointmentRow from "../components/admin/AS_AppointmentRow";
import AS_CreateAppointmentModal from "../components/admin/AS_CreateAppointmentModal";
import AS_SideBar from "../components/admin/AS_SideBar";
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

const appointmentStatusOptions: { label: string; value: AppointmentFilterStatus }[] = [
  { label: "All Appointments", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Awaiting Proof", value: "AWAITING_PROOF" },
  { label: "Proofs To Review", value: "PROOF_PENDING" },
  { label: "Proof Overdue", value: "PROOF_OVERDUE" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
];

const ROWS_PER_PAGE = 10;

const visibleStatuses: AppointmentStatus[] = [
  "PENDING",
  "AWAITING_PROOF",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export default function AS_Appointments() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [artists, setArtists] = useState<NailArtist[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentFilterStatus>("ALL");
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
  usePolling(() => loadAppointments(false), { intervalMs: 30000, immediate: false });

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

  return (
    <div className="flex min-h-screen lg:h-screen bg-light-orange px-2 py-2 sm:px-4 sm:py-4 overflow-x-hidden">
      <AS_SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-16 lg:pt-0">
        <header className="flex flex-col gap-4 w-full">
          <h3 className="text-sm text-gray-red/80">
            Welcome, Admin!
          </h3>

          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <h3 className="font-display text-2xl font-normal uppercase leading-tight tracking-widest text-gray-red sm:text-3xl">
                Appointments
              </h3>

              <Button
                type="button"
                onClick={() => setShowCreateAppointmentModal(true)}
                className="flex w-fit items-center gap-1.5 hover:opacity-90"
              >
                <PlusIcon size={14} className="text-light-orange" />
                <span className="text-[13px] font-semibold text-light-orange uppercase">
                  Create Appointment
                </span>
              </Button>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:gap-8">
              {/* SORT BY */}
              <div className="flex h-5 items-center gap-2">
                <label className="flex h-5 items-center text-[14px] text-gray-red">
                  Sort by
                </label>

                <Select className="w-40"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    >
                    <option value="Upcoming First">Upcoming First</option>
                    <option value="Latest First">Latest First</option>
                    <option value="Recently Booked">Recently Booked</option>
                    <option value="Oldest Booked">Oldest Booked</option>
                  </Select>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-sm lg:rounded-sm bg-light-orange p-4 sm:p-4 border border-crimson-light/80">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-4">
              {/* FILTER BY STATUS */}
              <div className="flex w-[calc(50%-6px)] items-center gap-1 sm:w-auto sm:gap-2">
                <label className="flex shrink-0 items-center text-[13px] text-gray-red sm:text-[14px]">
                  Filter by
                </label>

                <Select className="w-40"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as AppointmentFilterStatus)
                    }
                  >
                    {appointmentStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
              </div>

              {/* FILTER BY ARTIST */}
              <div className="flex w-[calc(50%-6px)] items-center gap-1 sm:w-auto sm:gap-2">
                <label className="flex shrink-0 items-center text-[13px] text-gray-red sm:text-[14px]">
                  Filter by
                </label>

                <Select className="w-40"
                    value={filterBy}
                    onFocus={loadArtists}
                    onClick={loadArtists}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="All">All Artists</option>

                    {artists.map((artist) => {
                      const name = getArtistName(artist);

                      if (!name) return null;

                      return (
                        <option key={artist.id} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </Select>
              </div>

              {/* SEARCH BAR */}
              <input
                type="search"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Search by appointment ID..."
                className="h-6 w-full basis-full rounded-md focus:ring-2 focus:ring-crimson bg-light-orange/80 px-4 text-[13px] text-gray-red placeholder:text-gray-red outline-none sm:ml-auto sm:w-[250px] sm:basis-auto"
              />
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="rounded-md bg-light-orange px-8 py-4 text-center text-sm font-medium text-gray-red border border-crimson-light/80">
              {statusFilter === "ALL"
                ? "No appointments found."
                : statusFilter === "PROOF_PENDING" ||
                    statusFilter === "PROOF_OVERDUE"
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
                  {/* SHOW LESS */}
                  {visibleCount > ROWS_PER_PAGE && (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setVisibleCount(ROWS_PER_PAGE)}
                      className="hover:opacity-70"
                    >
                      Show Less
                    </Button>
                  )}
                  
                  {/* SHOW MORE */}
                  {hasMoreAppointments && (
                    <Button
                      type="button"
                      onClick={() =>
                        setVisibleCount((prev) => prev + ROWS_PER_PAGE)
                      }
                      className="hover:opacity-70"
                    >
                      Show More
                    </Button>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateAppointmentModal && (
        <AS_CreateAppointmentModal
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
          <div className="w-full max-w-[380px] rounded-sm bg-light-orange px-8 py-4 shadow-lg drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none flex flex-col gap-4">
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
        <AS_AppointmentDetailsModal
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
    </div>
  );
}
