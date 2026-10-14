"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Activity, Moon, ShieldCheck, UserPlus } from "lucide-react";
import type { DirectoryProfile, DirectoryUser } from "@/components/features/admin/directory/DirectoryProfileCard";
import { useToast } from "@/components/molecules";
import { countIdle, countWithin } from "../../lib/directoryStats";
import { deleteDirectoryUser, fetchAdmins, fetchDirectoryProfiles, promoteAdmin, updateDirectoryUser } from "../../services/directoryService";

export interface AdminEditForm {
  firstName: string;
  lastName: string;
  email: string;
}

/** The result of adding an admin, shown in a dialog */
export interface AdminFeedback {
  isOpen: boolean;
  title: string;
  message: string;
  isError: boolean;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "");

// The Admin Directory's data and actions: the admins, their Clerk details and stat cards, the
// chosen admin, and adding, editing and removing one.
export function useAdminDirectory() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  // The admin whose profile shows beside the table (the first one until another is chosen)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = users.find((u) => u.id === selectedId) ?? users[0] ?? null;
  // The profile card on the page, so choosing an admin can bring it into view
  const [profileElement, setProfileElement] = useState<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<DirectoryUser | null>(null);
  const [editForm, setEditForm] = useState<AdminEditForm>({ firstName: "", lastName: "", email: "" });
  const [feedback, setFeedback] = useState<AdminFeedback>({ isOpen: false, title: "", message: "", isError: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setUsers(await fetchAdmins(await getToken(), currentUser?.id));
    } catch (err) {
      setError(errorMessage(err) || "Failed to load admin profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // Refresh when user is identified

  // The cards' photos and dates from Clerk; without them the cards show initials
  const [profiles, setProfiles] = useState<Record<string, DirectoryProfile>>({});
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  useEffect(() => {
    if (!currentUser) return;
    let live = true;
    (async () => {
      try {
        const { profiles: loaded } = await fetchDirectoryProfiles(await getToken(), currentUser?.id);
        if (live) {
          setProfiles(loaded);
          setProfilesLoaded(true);
        }
      } catch {
        // the cards keep their initials, and the stats that need Clerk dates show a dash
      }
    })();
    return () => {
      live = false;
    };
  }, [currentUser, getToken]);

  const createAdmin = async (data: { email: string }) => {
    setIsSaving(true);
    try {
      const result = await promoteAdmin(data.email, await getToken(), currentUser?.id);
      setIsAddAdminOpen(false);
      setIsSaving(false);
      if (result.ok) {
        setFeedback({ isOpen: true, title: "Admin Added!", message: `Success! ${data.email} has been promoted to an admin.`, isError: false });
        await loadUsers();
      } else {
        setFeedback({ isOpen: true, title: "Action Failed", message: result.error || "Could not complete this action.", isError: true });
      }
    } catch {
      setIsAddAdminOpen(false);
      setIsSaving(false);
      setFeedback({ isOpen: true, title: "Connection Error", message: "Failed to connect to the server. Please try again.", isError: true });
    }
  };

  const openEdit = (user: DirectoryUser) => {
    setSelectedAdmin(user);
    setEditForm({ firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "" });
    setIsEditModalOpen(true);
  };

  const confirmEdit = async () => {
    if (!selectedAdmin) return;
    setIsSaving(true);
    const targetId = selectedAdmin.clerk_id || selectedAdmin.id;
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authorized");
      await updateDirectoryUser(
        targetId,
        { firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, role: selectedAdmin.role || "Admin", phoneNumber: "" },
        token,
        currentUser?.id,
      );
      await loadUsers();
      setIsEditModalOpen(false);
      setSelectedAdmin(null);
      toast.show("success", "Admin updated", "The new details were saved.");
    } catch (err) {
      toast.show("error", "Admin not updated", errorMessage(err) || "We couldn't save the changes to this admin profile, so it still shows the previous details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDelete = (user: DirectoryUser) => {
    setSelectedAdmin(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAdmin) return;
    const targetId = selectedAdmin.clerk_id || selectedAdmin.id;
    try {
      setIsDeleting(true);
      const token = await getToken();
      if (!token) throw new Error("Not authorized");
      await deleteDirectoryUser(targetId, token, currentUser?.id);
      // An admin who removed themself has no access any more
      if (targetId === currentUser?.id) {
        window.location.href = "/";
        return;
      }
      await loadUsers();
      setIsDeleteModalOpen(false);
      setSelectedAdmin(null);
      toast.show("success", "Admin removed", "They no longer have admin access.");
    } catch (err) {
      toast.show("error", "Admin not removed", errorMessage(err) || "We couldn't remove this admin, so they still have access. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const dated = (count: (users: DirectoryUser[]) => number) => (profilesLoaded ? count(users) : null);
  return {
    loading,
    error,
    users,
    profiles,
    selected,
    setProfileElement,
    /** Shows this admin's profile beside the table */
    select: (user: DirectoryUser) => {
      setSelectedId(user.id);
      profileElement?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    },
    stats: [
      { label: "Total admins", value: users.length, hint: "with admin access", icon: ShieldCheck },
      { label: "Active this week", value: dated((u) => countWithin(u, profiles, "lastSignInAt", 7)), hint: "signed in in the last 7 days", icon: Activity },
      { label: "Inactive", value: dated((u) => countIdle(u, profiles, 30)), hint: "no sign-in for 30 days or more", icon: Moon },
      { label: "New admins", value: dated((u) => countWithin(u, profiles, "joinedAt", 90)), hint: "joined in the last 90 days", icon: UserPlus },
    ],
    isSaving,
    isAddAdminOpen,
    openAdd: () => setIsAddAdminOpen(true),
    closeAdd: () => setIsAddAdminOpen(false),
    createAdmin,
    /** The admin being edited or removed */
    selectedAdmin,
    isEditModalOpen,
    editForm,
    setEditForm,
    openEdit,
    closeEdit: () => setIsEditModalOpen(false),
    confirmEdit,
    isDeleteModalOpen,
    isDeleting,
    openDelete,
    closeDelete: () => setIsDeleteModalOpen(false),
    confirmDelete,
    feedback,
    closeFeedback: () => setFeedback((current) => ({ ...current, isOpen: false })),
  };
}
