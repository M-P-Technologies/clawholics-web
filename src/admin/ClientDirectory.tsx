"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import AdminShell from "../components/admin/AdminShell";
import ClientRow from "../components/admin/ClientRow";
import DirectoryProfileCard from "../components/admin/DirectoryProfileCard";
import DirectoryTable from "../components/admin/DirectoryTable";
import ClientNotesPanel from "../components/admin/ClientNotesPanel";
import type { DirectoryProfile, DirectoryUser } from "../components/admin/DirectoryProfileCard";
import {
  createDirectoryUser,
  deleteDirectoryUser,
  fetchDirectoryProfiles,
  fetchDirectoryUsers,
  updateDirectoryUser,
  type DirectoryUserPayload,
} from "../services/directoryService";
import { fetchWarmLeads } from "../services/dashboardService";
import { Link, useSearchParams } from "../lib/router";
import { LoadingBar } from "../components/ui/LoadingBar";
import AlertModal from "../components/ui/AlertModal";
import Button from "../components/ui/Button";
import ConfirmModal from "../components/ui/ConfirmModal";

const emptyFormData: DirectoryUserPayload = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  role: "client",
};

const TILES_PER_PAGE = 10;

function isClientRole(role?: string) {
  const normalizedRole = role?.trim().toLowerCase();

  return (
    !normalizedRole ||
    normalizedRole === "client" ||
    normalizedRole === "customer"
  );
}

function getClientFullName(user: DirectoryUser) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
}

export default function ClientDirectory() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // ?view=leads (from the dashboard's Warm leads): only the clients who haven't booked yet
  const [searchParams] = useSearchParams();
  const leadsView = searchParams.get("view") === "leads";
  const [leadIds, setLeadIds] = useState<Set<string> | null>(null);
  const [leadsError, setLeadsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [formData, setFormData] = useState<DirectoryUserPayload>({
    ...emptyFormData,
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<DirectoryUser | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [notesClient, setNotesClient] = useState<DirectoryUser | null>(null);

  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
  });

  const [visibleCount, setVisibleCount] = useState(TILES_PER_PAGE);
  // Desktop: the client whose profile shows beside the table (the first one until another is chosen)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The cards' photos and dates from Clerk; without them the cards show initials
  const [profiles, setProfiles] = useState<Record<string, DirectoryProfile>>({});
  useEffect(() => {
    if (!isAuthLoaded) return;
    let live = true;
    (async () => {
      try {
        const { profiles: loaded } = await fetchDirectoryProfiles(await getToken(), currentUser?.id);
        if (live) setProfiles(loaded);
      } catch {
        // the cards keep their initials
      }
    })();
    return () => {
      live = false;
    };
  }, [isAuthLoaded, getToken, currentUser?.id]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();
      const data = await fetchDirectoryUsers(token, currentUser?.id);

      const clients = data
        .filter((user) => isClientRole(user.role))
        .map((user) => ({
          ...user,
          role: "Client",
        }));

      setUsers(clients);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load client profiles.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isAuthLoaded) return;

    loadUsers();
  }, [isAuthLoaded, loadUsers]);

  useEffect(() => {
    if (!isAuthLoaded || !leadsView) return;
    let live = true;
    (async () => {
      try {
        const { clerkIds } = await fetchWarmLeads(await getToken(), currentUser?.id);
        if (live) setLeadIds(new Set(clerkIds));
      } catch {
        if (live) setLeadsError(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [isAuthLoaded, leadsView, getToken, currentUser?.id]);

  useEffect(() => {
    setVisibleCount(TILES_PER_PAGE);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({ ...emptyFormData });
    setEditingUser(null);
    setFormError("");
  };

  const closeForm = () => {
    if (isSaving) return;

    setIsFormOpen(false);
    resetForm();
  };

  const handleEditClient = (user: DirectoryUser) => {
    const userWithPossiblePhone = user as DirectoryUser & { phone?: string };

    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber || userWithPossiblePhone.phone || "",
      email: user.email || "",
      role: "client",
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const handleFormChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value.replace(/[^\d+]/g, "");

    if (value.indexOf("+") > 0) {
      value = value.replace(/\+/g, "");
    }

    if (value.startsWith("+63")) {
      value = value.slice(0, 13);
    } else if (value.startsWith("09")) {
      value = value.slice(0, 11);
    } else if (value.startsWith("+")) {
      value = value.slice(0, 13);
    } else {
      value = value.slice(0, 11);
    }

    setFormData((prev) => ({
      ...prev,
      phoneNumber: value,
    }));
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const currentPhone = formData.phoneNumber.trim();
    const isValid09 =
      currentPhone.startsWith("09") && currentPhone.length === 11;
    const isValid63 =
      currentPhone.startsWith("+639") && currentPhone.length === 13;

    if (!isValid09 && !isValid63) {
      setFormError(
        "Please enter a valid Philippine phone number (e.g., 09xxxxxxxxx or +639xxxxxxxxx).",
      );
      return;
    }

    const payload: DirectoryUserPayload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phoneNumber: currentPhone,
      email: formData.email?.trim() || undefined,
      role: "client",
    };

    try {
      setIsSaving(true);
      setFormError("");

      const token = await getToken();

      if (editingUser) {
        await updateDirectoryUser(editingUser.id, payload, token, currentUser?.id);
      } else {
        await createDirectoryUser(payload, token, currentUser?.id);
      }

      await loadUsers(); // Force a fresh fetch from the server to ensure consistency
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save client profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = (user: DirectoryUser) => {
    setClientToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;

    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      setIsDeleting(true);

      const token = await getToken();
      await deleteDirectoryUser(clientToDelete.id, token, currentUser?.id);

      setUsers((prev) => prev.filter((item) => item.id !== clientToDelete.id));

      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (err) {
      setIsDeleteModalOpen(false);
      setFeedbackModal({
        isOpen: true,
        title: "Action Failed",
        message:
          err instanceof Error
            ? err.message
            : "Failed to delete client profile.",
        isError: true,
      });
      setClientToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredUsers = users.filter((user) => {
    if (leadsView && !(leadIds?.has(user.id) ?? false)) return false;
    if (!normalizedSearchQuery) return true;

    const firstName = user.firstName ?? "";
    const lastName = user.lastName ?? "";
    const fullName = getClientFullName(user);
    const reversedFullName = `${lastName} ${firstName}`
      .replace(/\s+/g, " ")
      .trim();

    const searchableValues = [
      user.name,
      user.fullName,
      firstName,
      lastName,
      fullName,
      reversedFullName,
    ];

    return searchableValues.some((value) =>
      (value ?? "").toLowerCase().includes(normalizedSearchQuery),
    );
  });

  const visibleUsers = filteredUsers.slice(0, visibleCount);
  const selected = filteredUsers.find((u) => u.id === selectedId) ?? filteredUsers[0] ?? null;
  const hasMoreUsers = visibleCount < filteredUsers.length;

  const isSubmitDisabled =
    isSaving ||
    !formData.firstName.trim() ||
    !formData.lastName.trim() ||
    !formData.phoneNumber.trim();

  if (loading) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading clients" />
      </div>
    );
  }

  return (
    <AdminShell
      title="Client Directory"
      actions={
        <input
          type="search"
          aria-label="Search client"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search client..."
          className="h-10 w-full rounded-full border border-crimson-light bg-milk px-4 text-[13px] text-gray-red outline-none placeholder:text-gray-red focus:ring-2 focus:ring-crimson sm:w-62.5 lg:h-7"
        />
      }
    >
        {leadsView && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-crimson-light/40 bg-milk px-4 py-3 shadow-petal text-sm text-gray-red">
            <p>
              {leadsError
                ? "We couldn't load the warm leads."
                : leadIds === null
                  ? "Loading warm leads…"
                  : `${leadIds.size} warm ${leadIds.size === 1 ? "lead: made an account or started a booking in the last 60 days, but hasn't" : "leads: made an account or started a booking in the last 60 days, but haven't"} booked a visit yet.`}
            </p>
            <Link to="/client-directory" className="font-bold text-berry underline underline-offset-4">
              Show all clients
            </Link>
          </div>
        )}
        <div className="flex-1 overflow-y-auto pb-2">
          {error ? (
            <div className="rounded-2xl border border-crimson-light/40 bg-milk px-8 py-4 text-center text-sm font-medium text-gray-red shadow-petal">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-crimson-light/40 bg-milk px-8 py-4 text-center text-sm font-medium text-gray-red shadow-petal">
              No client profiles found.
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-crimson-light/40 bg-milk px-8 py-4 text-center text-sm font-medium text-gray-red shadow-petal">
              {leadsView && !normalizedSearchQuery ? (leadIds === null ? "" : "No warm leads right now.") : "No clients match your search."}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div role="group" aria-label="Clients (phone)" className="flex flex-col gap-2 lg:hidden">
                {visibleUsers.map((user) => (
                  <ClientRow
                    key={user.id}
                    user={user}
                    onEdit={handleEditClient}
                    onDelete={handleDeleteClient}
                    onNotes={user.user_id ? (u) => setNotesClient(u) : undefined}
                  />
                ))}
              </div>

              {/* Desktop: the table (2/3) and the chosen client's profile (1/3) */}
              <div className="hidden gap-4 md:gap-6 lg:grid lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2 lg:h-full">
                  <DirectoryTable label="Clients" users={filteredUsers} profiles={profiles} selectedId={selected?.id ?? null} onSelect={(u) => setSelectedId(u.id)} showVisits />
                </div>
                {selected && (
                  <div className="lg:h-full">
                    <DirectoryProfileCard
                      key={selected.id}
                      user={selected}
                      profile={profiles[selected.clerk_id ?? selected.id]}
                      clientHref={selected.user_id ? `/clients/${selected.user_id}` : undefined}
                      onEdit={handleEditClient}
                      onDelete={handleDeleteClient}
                      onNotes={selected.user_id ? (u) => setNotesClient(u) : undefined}
                    />
                  </div>
                )}
              </div>

              {filteredUsers.length > TILES_PER_PAGE && (
                <div className="flex justify-center gap-4 lg:hidden">
                  {/* SHOW LESS */}
                  {visibleCount > TILES_PER_PAGE && (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setVisibleCount(TILES_PER_PAGE)}
                      className="hover:opacity-70"
                    >
                      Show Less
                    </Button>
                  )}

                  {/* SHOW MORE */}
                  {hasMoreUsers && (
                    <Button
                      type="button"
                      onClick={() =>
                        setVisibleCount((prev) => prev + TILES_PER_PAGE)
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

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
          <div className="bg-milk border border-crimson-light/40 flex flex-col gap-4 rounded-2xl p-4 md:gap-8 md:p-8 max-w-md w-full text-gray-red shadow-xl transition-all drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
            <h1 className="text-3xl text-center font-display">
              {editingUser ? "EDIT CLIENT" : "ADD CLIENT"}
            </h1>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4 font-sans">
                <div>
                  <label className="block text-sm opacity-80 mb-1 ml-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleFormChange}
                    className="w-full bg-milk border border-crimson-light rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-crimson"
                  />
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-1 ml-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleFormChange}
                    className="w-full bg-milk border border-crimson-light rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-crimson"
                  />
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-1 ml-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    readOnly
                    disabled
                    className="w-full bg-crimson/10 border border-crimson/20 text-gray-red/60 rounded-md px-4 py-2 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-1 ml-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    maxLength={15}
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    className={`w-full bg-milk border border-crimson-light rounded-md px-4 py-2 focus:outline-none focus:ring-1 ${
                      formError
                        ? "ring-danger border-danger"
                        : "focus:ring-crimson"
                    }`}
                  />
                </div>

                {formError && (
                  <p className="ml-2 text-sm text-danger">{formError}</p>
                )}
              </div>

              <div className="flex justify-center gap-4 font-sans">
                <Button
                  variant="bare"
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className={`px-8 py-2 text-[16px] rounded-md border border-crimson font-bold hover:scale-105 transition-colors ${
                    isSaving
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-light-orange"
                  }`}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitDisabled && !isSaving}
                  loading={isSaving}
                  loadingText="Saving..."
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={isDeleteModalOpen && !!clientToDelete}
        title="Remove client?"
        confirmLabel="Remove client"
        loadingLabel="Removing..."
        loading={isDeleting}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteClient}
      >
        Are you sure you want to remove{" "}
        <strong>
          {clientToDelete?.firstName} {clientToDelete?.lastName}
        </strong>{" "}
        from the Client Directory? Their client account will be deleted immediately.
      </ConfirmModal>

      {notesClient && notesClient.user_id !== undefined && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0"
          onClick={() => setNotesClient(null)}
        >
          <div
            className="bg-milk border border-crimson-light/40 flex flex-col gap-4 rounded-2xl p-4 md:gap-8 md:p-8 max-w-lg w-full max-h-[calc(100vh-32px)] overflow-y-auto text-gray-red shadow-xl drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-2xl font-display">
                Notes: {notesClient.firstName} {notesClient.lastName}
              </p>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setNotesClient(null)}
                
              >
                Close
              </Button>
            </div>

            <ClientNotesPanel
              clientUserId={notesClient.user_id}
              tokenFetcher={getToken}
              clerkId={currentUser?.id}
            />
          </div>
        </div>
      )}

      <AlertModal
        open={feedbackModal.isOpen}
        title={feedbackModal.title}
        message={feedbackModal.message}
        buttonText="OK"
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </AdminShell>
  );
}
