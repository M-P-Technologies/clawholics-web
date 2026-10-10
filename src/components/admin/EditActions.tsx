import Button from "../ui/Button";

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

// The button row at the bottom of every admin card.
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
    <div className="flex min-h-10 flex-wrap justify-center gap-4">
      {isEditing ? (
        <>
          <Button variant="secondary" onClick={onCancel} disabled={locked} className="w-25">
            Cancel
          </Button>
          <Button onClick={onSave} loading={isSaving} loadingText={isCreateMode ? "Adding..." : "Saving..."} disabled={busy} className="w-25">
            {isCreateMode ? "Add" : "Save"}
          </Button>
        </>
      ) : isCreateMode ? null : (
        <>
          {onDelete && (
            <Button variant="secondary" onClick={onDelete} className="w-25">
              Delete
            </Button>
          )}
          <Button onClick={onEdit} className="w-25">
            Edit
          </Button>
        </>
      )}
    </div>
  );
}
