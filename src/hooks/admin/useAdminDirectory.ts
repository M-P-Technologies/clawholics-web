"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Moon, ShieldCheck, UserPlus } from "lucide-react";
import type { DirectoryProfile, DirectoryUser } from "../../components/admin/DirectoryProfileCard";
import { useToast } from "../../components/ui/ToastProvider";
import { countIdle, countWithin } from "../../lib/directoryStats";
import { adminQueries, directoryChanged } from "../../lib/adminQueries";
import { deleteDirectoryUser, promoteAdmin, updateDirectoryUser } from "../../services/directoryService";

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

const NO_USERS: DirectoryUser[] = [];
/** Admins to a page: five keeps the table beside the profile card short */
export const ADMIN_PAGE_SIZE = 5;
const NO_PROFILES: Record<string, DirectoryProfile> = {};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "");

// The Admin Directory's data and actions: the admins, their Clerk details and stat cards, the
// chosen admin, and adding, editing and removing one.
export function useAdminDirectory() {
  const toast = useToast();
  const { getToken, isLoaded } = useAuth();
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();
  const session = { getToken, clerkId: currentUser?.id };
  // One page of admins at a time (the page before stays up while the next loads), and the
  // cards' photos and dates from Clerk (shared with Clients & Bookings); without those the cards
  // show initials, and the stats that need Clerk dates show a dash
  const [page, setPage] = useState(1);
  // The last total seen, so a list that shrank (an admin removed) keeps you on its last page
  const [lastTotal, setLastTotal] = useState(0);
  const shownPage = lastTotal > 0 ? Math.min(page, Math.ceil(lastTotal / ADMIN_PAGE_SIZE)) : page;
  const adminsQuery = useQuery({
    ...adminQueries.adminPage(shownPage, ADMIN_PAGE_SIZE, session),
    enabled: isLoaded && !!currentUser,
    placeholderData: keepPreviousData,
  });
  const profilesQuery = useQuery({ ...adminQueries.directoryProfiles(session), enabled: isLoaded && !!currentUser });
  const total = adminsQuery.data?.total ?? 0;
  if (adminsQuery.data && total !== lastTotal) setLastTotal(total);
  const users = adminsQuery.data?.rows ?? NO_USERS;
  // Every admin, by Clerk id, for the stat cards
  // (one without a Clerk id has no Clerk dates, so counts as never signed in)
  const everyAdmin = (adminsQuery.data?.clerkIds ?? []).map(
    (id, i) => ({ id: id ?? `no-clerk-id-${i}`, clerk_id: id ?? undefined }) as DirectoryUser,
  );
  const profiles = profilesQuery.data ?? NO_PROFILES;
  const profilesLoaded = profilesQuery.data !== undefined;
  const loading = adminsQuery.isPending;
  // A failed refresh keeps the list already loaded
  const error = adminsQuery.isError && !adminsQuery.data ? errorMessage(adminsQuery.error) || "Failed to load admin profiles." : "";
  // The admin whose profile shows beside the table (the first one until another is chosen). They
  // stay chosen on another page; their row is read fresh while it's on the page shown.
  const [chosen, setChosen] = useState<DirectoryUser | null>(null);
  const selected = (chosen && (users.find((u) => u.id === chosen.id) ?? chosen)) ?? users[0] ?? null;
  // The profile card on the page, so choosing an admin can bring it into view
  const [profileElement, setProfileElement] = useState<HTMLDivElement | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<DirectoryUser | null>(null);
  const [editForm, setEditForm] = useState<AdminEditForm>({ firstName: "", lastName: "", email: "" });
  const [feedback, setFeedback] = useState<AdminFeedback>({ isOpen: false, title: "", message: "", isError: false });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // After a change, the directory's lists are fetched again (this one included)
  const loadUsers = () => directoryChanged(queryClient);

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
      // A removed admin's profile doesn't stay beside the table
      setChosen((current) => (current?.id === selectedAdmin.id ? null : current));
      setSelectedAdmin(null);
      toast.show("success", "Admin removed", "They no longer have admin access.");
    } catch (err) {
      toast.show("error", "Admin not removed", errorMessage(err) || "We couldn't remove this admin, so they still have access. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const dated = (count: (users: DirectoryUser[]) => number) => (profilesLoaded && adminsQuery.data ? count(everyAdmin) : null);
  return {
    loading,
    error,
    users,
    /** The page shown, the admins in all, and moving to another page */
    page: shownPage,
    total,
    pageSize: ADMIN_PAGE_SIZE,
    setPage,
    profiles,
    selected,
    setProfileElement,
    /** Shows this admin's profile beside the table */
    select: (user: DirectoryUser) => {
      setChosen(user);
      profileElement?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    },
    stats: [
      { label: "Total admins", value: adminsQuery.data ? total : null, hint: "with admin access", icon: ShieldCheck },
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
