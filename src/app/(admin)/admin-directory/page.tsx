"use client";

import { Plus } from "lucide-react";
import AddAdminModal from "@/components/features/admin/directory/AddAdminModal";
import AdminShell from "@/components/features/admin/shell/AdminShell";
import DirectoryProfileCard from "@/components/features/admin/directory/DirectoryProfileCard";
import DirectoryStats from "@/components/features/admin/directory/DirectoryStats";
import DirectoryTable from "@/components/features/admin/directory/DirectoryTable";
import EditAdminModal from "@/components/features/admin/directory/EditAdminModal";
import { ConfirmDialog, Dialog, FeedbackDialog } from "@/components/organisms";
import { Button } from "@/components/atoms";
import { AdminDirectorySkeleton } from "@/components/features/admin/skeletons/skeletons";
import { useAdminDirectory } from "@/hooks/admin/useAdminDirectory";

// The Admin Directory: the admin totals, the admins in a table and the chosen one's profile, and
// adding, editing and removing an admin. Its data and actions are in hooks/admin/useAdminDirectory.
export default function AdminDirectory() {
  const d = useAdminDirectory();
  const { users, selected, selectedAdmin, setProfileElement } = d;

  if (d.loading) return <AdminDirectorySkeleton />;

  return (
    <AdminShell title="Admin Directory">
      {!d.error && <DirectoryStats label="Admin totals" stats={d.stats} />}

      <div className="flex-1 overflow-y-auto pb-2">
        {d.error ? (
          <div className="p-3 text-gray-red font-bold">{d.error}</div>
        ) : users.length === 0 ? (
          <div className="p-3 font-bold text-gray-red">No admin profiles found.</div>
        ) : (
          // The table (2/3) and the chosen admin's profile (1/3); on a phone the profile comes after the table
          <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2 lg:h-full">
              <DirectoryTable
                label="Admins"
                users={users}
                profiles={d.profiles}
                selectedId={d.selectedRowId}
                onSelect={d.select}
                serverPage={d.serverPage}
                action={
                  <Button size="sm" type="button" onClick={d.openAdd} className="shrink-0 whitespace-nowrap">
                    <Plus size={14} aria-hidden="true" className="hidden sm:block" />
                    Add admin
                  </Button>
                }
              />
            </div>
            {selected && (
              // Beside the table from lg; below it the chosen admin opens in the bottom sheet
              <div ref={setProfileElement} className="hidden lg:block lg:h-full">
                <DirectoryProfileCard
                  key={selected.id}
                  user={selected}
                  profile={d.profiles[selected.clerk_id ?? selected.id]}
                  onEdit={() => d.openEdit(selected)}
                  onDelete={() => d.openDelete(selected)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={d.sheetUser !== null} title="Admin profile" onClose={d.closeSheet} placement="sheet">
        {d.sheetUser && (
          <DirectoryProfileCard
            bare
            user={d.sheetUser}
            profile={d.profiles[d.sheetUser.clerk_id ?? d.sheetUser.id]}
            onEdit={() => d.openEdit(d.sheetUser!)}
            onDelete={() => d.openDelete(d.sheetUser!)}
          />
        )}
      </Dialog>

      <AddAdminModal open={d.isAddAdminOpen} onClose={d.closeAdd} onSubmit={d.createAdmin} isSaving={d.isSaving} />

      <EditAdminModal open={d.isEditModalOpen} form={d.editForm} saving={d.isSaving} onChange={d.setEditForm} onClose={d.closeEdit} onSave={d.confirmEdit} />

      <ConfirmDialog
        open={d.isDeleteModalOpen && !!selectedAdmin}
        title="Remove admin?"
        confirmLabel="Remove admin"
        loadingLabel="Removing..."
        loading={d.isDeleting}
        onClose={d.closeDelete}
        onConfirm={d.confirmDelete}
      >
        Are you sure you want to remove{" "}
        <strong>
          {selectedAdmin?.firstName} {selectedAdmin?.lastName}
        </strong>{" "}
        from the Admin Directory? They will lose all administrative privileges immediately.
      </ConfirmDialog>

      <FeedbackDialog open={d.feedback.isOpen} title={d.feedback.title} message={d.feedback.message} isError={d.feedback.isError} onClose={d.closeFeedback} />
    </AdminShell>
  );
}
