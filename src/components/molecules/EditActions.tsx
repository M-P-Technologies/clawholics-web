"use client";

import { Button } from "@/components/atoms";

interface EditActionsProps {
  isEditing: boolean;
  /** A form for a new item: there is nothing to delete, and saving says "Add" */
  isCreateMode?: boolean;
  isSaving: boolean;
  /** Locks the buttons for another reason, for example while a photo is uploading */
  busy?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  /** Adds a Delete button next to Edit when not editing */
  onDelete?: () => void;
}

// The button row at the bottom of every item in the content editors.
// Viewing: Edit (and Delete, when it can be deleted). Editing: Cancel and Save, or Add for a new item.
export default function EditActions({
  isEditing,
  isCreateMode = false,
  isSaving,
  busy = false,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: EditActionsProps) {
  const locked = isSaving || busy;

  return (
    <div className="flex min-h-9 flex-wrap justify-end gap-3">
      {isEditing ? (
        <>
          <Button variant="secondary" onClick={onCancel} disabled={locked} className="px-3! py-1.5! text-[13px]">
            Cancel
          </Button>
          <Button onClick={onSave} loading={isSaving} loadingText={isCreateMode ? "Adding..." : "Saving..."} disabled={busy} className="px-3! py-1.5! text-[13px]">
            {isCreateMode ? "Add" : "Save"}
          </Button>
        </>
      ) : isCreateMode ? null : (
        <>
          {onDelete && (
            <Button variant="secondary" onClick={onDelete} className="px-3! py-1.5! text-[13px]">
              Delete
            </Button>
          )}
          <Button onClick={onEdit} className="px-3! py-1.5! text-[13px]">
            Edit
          </Button>
        </>
      )}
    </div>
  );
}
