"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import AdminShell from "../components/admin/AdminShell";
import DirectoryProfileCard from "../components/admin/DirectoryProfileCard";
import DirectoryTable from "../components/admin/DirectoryTable";
import AddAdminModal from "../components/admin/AddAdminModal";
import type { DirectoryProfile, DirectoryUser } from "../components/admin/DirectoryProfileCard";
import { LoadingBar } from "../components/ui/LoadingBar";
import {
  updateDirectoryUser,
  deleteDirectoryUser,
  fetchDirectoryProfiles,
} from "../services/directoryService";
import { API_BASE_URL } from "../apiConfig";
import { useToast } from "../components/ui/ToastProvider";
import Button from "../components/ui/Button";
import ConfirmModal from "../components/ui/ConfirmModal";

interface ExtendedDirectoryUser extends DirectoryUser {
  clerk_id?: string;
}

export default function AdminDirectory() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<ExtendedDirectoryUser[]>([]);
  // The admin whose profile shows beside the table (the first one until another is chosen)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = users.find((u) => u.id === selectedId) ?? users[0] ?? null;
  const profileRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] =
    useState<ExtendedDirectoryUser | null>(null);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    isError: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(`${API_BASE_URL}/users/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
          clerk_id: currentUser?.id || "",
          "x-clawholics-origin": "frontend",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch admins");
      const admins = await response.json();
      setUsers(admins);
    } catch (err: any) {
      setError(err.message || "Failed to load admin profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser]); // Refresh when user is identified

  // The cards' photos and dates from Clerk; without them the cards show initials
  const [profiles, setProfiles] = useState<Record<string, DirectoryProfile>>({});
  useEffect(() => {
    if (!currentUser) return;
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
  }, [currentUser, getToken, currentUser?.id]);

  const handleAddAdmin = () => {
    setIsAddAdminOpen(true);
  };

  const handleCreateAdmin = async (data: { email: string }) => {
    setIsSaving(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/users/promote-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          clerk_id: currentUser?.id || "",
          "x-clawholics-origin": "frontend",
        },
        body: JSON.stringify({ targetEmail: data.email }),
      });

      const result = await response.json();

      setIsAddAdminOpen(false);
      setIsSaving(false);

      if (response.ok && !result.error) {
        setFeedbackModal({
          isOpen: true,
          title: "Admin Added!",
          message: `Success! ${data.email} has been promoted to an admin.`,
          isError: false,
        });

        await loadUsers();
      } else {
        setFeedbackModal({
          isOpen: true,
          title: "Action Failed",
          message: result.error || "Could not complete this action.",
          isError: true,
        });
      }
    } catch {
      setIsAddAdminOpen(false);
      setIsSaving(false);

      setFeedbackModal({
        isOpen: true,
        title: "Connection Error",
        message: "Failed to connect to the server. Please try again.",
        isError: true,
      });
    }
  };

  const openEditModal = (user: ExtendedDirectoryUser) => {
    setSelectedAdmin(user);
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
    });
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!selectedAdmin) return;

    setIsSaving(true);
    const targetId = selectedAdmin.clerk_id || selectedAdmin.id;

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authorized");

      await updateDirectoryUser(
        targetId,
        {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          role: selectedAdmin.role || "Admin",
          phoneNumber: "",
        },
        token,
        currentUser?.id,
      );

      await loadUsers();

      setIsEditModalOpen(false);
      setSelectedAdmin(null);
      toast.show("success", "Admin updated", "The new details were saved.");
    } catch (err: any) {
      setIsSaving(false);
      toast.show("error", "Admin not updated", err.message || "We couldn't save the changes to this admin profile, so it still shows the previous details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (user: ExtendedDirectoryUser) => {
    setSelectedAdmin(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAdmin) return;

    const targetId = selectedAdmin.clerk_id || selectedAdmin.id;

    try {
      setIsDeleting(true);
      const token = await getToken();
      if (!token) throw new Error("Not authorized");

      await deleteDirectoryUser(targetId, token, currentUser?.id);

      if (targetId === currentUser?.id) {
        window.location.href = "/";
        return;
      }

      await loadUsers();
      setIsDeleteModalOpen(false);
      setSelectedAdmin(null);
      toast.show("success", "Admin removed", "They no longer have admin access.");
    } catch (err: any) {
      toast.show("error", "Admin not removed", err.message || "We couldn't remove this admin, so they still have access. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading admins" />
      </div>
    );
  }

  return (
    <AdminShell title="Admin Directory" actions={<Button onClick={handleAddAdmin}>Add Admin</Button>}>

        <div className="flex-1 overflow-y-auto pb-2">
          {error ? (
            <div className="p-4 text-gray-red font-bold">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-4 font-bold text-gray-red">
              No admin profiles found.
            </div>
          ) : (
            // The table (2/3) and the chosen admin's profile (1/3); on a phone the profile comes after the table
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2 lg:h-full">
                <DirectoryTable
                  label="Admins"
                  users={users}
                  profiles={profiles}
                  selectedId={selected?.id ?? null}
                  onSelect={(u) => {
                    setSelectedId(u.id);
                    profileRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
                  }}
                />
              </div>
              {selected && (
                <div ref={profileRef} className="lg:h-full">
                  <DirectoryProfileCard
                    key={selected.id}
                    user={selected}
                    profile={profiles[selected.clerk_id ?? selected.id]}
                    onEdit={() => openEditModal(selected)}
                    onDelete={() => openDeleteModal(selected)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <AddAdminModal
          open={isAddAdminOpen}
          onClose={() => setIsAddAdminOpen(false)}
          onSubmit={handleCreateAdmin}
          isSaving={isSaving}
        />

        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
            <div className="bg-milk border border-crimson-light/40 flex flex-col gap-4 rounded-2xl p-4 md:gap-8 md:p-8 max-w-md w-full text-gray-red shadow-xl transition-all drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
              {isSaving ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <LoadingBar inline />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl text-center font-display">
                    EDIT ADMIN
                  </h1>

                  <div className="flex flex-col gap-4 font-sans">
                    <div>
                      <label className="block text-sm opacity-80 mb-1 ml-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            firstName: e.target.value,
                          })
                        }
                        className="w-full bg-milk border border-crimson-light rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-crimson"
                      />
                    </div>
                    <div>
                      <label className="block text-sm opacity-80 mb-1 ml-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, lastName: e.target.value })
                        }
                        className="w-full bg-milk border border-crimson-light rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-crimson"
                      />
                    </div>
                    <div>
                      <label className="block text-sm opacity-80 mb-1 ml-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        readOnly
                        disabled
                        className="w-full bg-crimson/10 border border-crimson/20 text-gray-red/60 rounded-md px-4 py-2 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 font-sans">
                    <Button
                      variant="bare"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isSaving}
                      className={`px-8 py-2 text-[16px] rounded-md border border-crimson font-bold hover:scale-105 transition-colors ${
                        isSaving
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-light-orange"
                      }`}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleConfirmEdit} loading={isSaving} loadingText="Saving...">
                      Save Changes
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ConfirmModal
          open={isDeleteModalOpen && !!selectedAdmin}
          title="Remove admin?"
          confirmLabel="Remove admin"
          loadingLabel="Removing..."
          loading={isDeleting}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
        >
          Are you sure you want to remove{" "}
          <strong>
            {selectedAdmin?.firstName} {selectedAdmin?.lastName}
          </strong>{" "}
          from the Admin Directory? They will lose all administrative privileges immediately.
        </ConfirmModal>

        {feedbackModal.isOpen && (
          <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
            <div className="bg-milk border border-crimson-light/40 flex flex-col gap-4 rounded-2xl p-4 md:gap-8 md:p-8 max-w-sm w-full text-center shadow-xl transform transition-all drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
              <div
                className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${feedbackModal.isError ? "bg-danger/10" : "bg-crimson/10"}`}
              >
                {feedbackModal.isError ? (
                  <svg
                    className="h-8 w-8 text-gray-red"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-8 w-8 text-gray-red"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              <h1
                className={`text-3xl ${feedbackModal.isError ? "text-crimson" : "text-crimson"}`}
              >
                {feedbackModal.title}
              </h1>

              <p className="font-sans opacity-90 text-sm md:text-base leading-relaxed text-gray-red">
                {feedbackModal.message}
              </p>

              <Button
                onClick={() =>
                  setFeedbackModal({ ...feedbackModal, isOpen: false })
                }
                className="hover:scale-105 transition-transform"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      
    </AdminShell>
  );
}
