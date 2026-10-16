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
          <Button size="sm" variant="secondary" onClick={onCancel} disabled={locked}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} loading={isSaving} loadingText={isCreateMode ? "Adding..." : "Saving..."} disabled={busy}>
            {isCreateMode ? "Add" : "Save"}
          </Button>
        </>
      ) : isCreateMode ? null : (
        <>
          {onDelete && (
            <Button size="sm" variant="secondary" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button size="sm" onClick={onEdit}>
            Edit
          </Button>
        </>
      )}
    </div>
  );
}
