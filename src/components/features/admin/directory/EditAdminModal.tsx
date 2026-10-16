import type { AdminEditForm } from "@/hooks/admin/useAdminDirectory";
import { Button } from "@/components/atoms";
import { FormField } from "@/components/molecules";
import { Dialog } from "@/components/organisms";

interface EditAdminModalProps {
  open: boolean;
  form: AdminEditForm;
  saving: boolean;
  onChange: (form: AdminEditForm) => void;
  onClose: () => void;
  onSave: () => void;
}

// Edits an admin's name; the email is the account's, so it only shows. Drawn like the admin's other
// dialogs: the title and close button, the fields, and Cancel and Save in the footer.
export default function EditAdminModal({ open, form, saving, onChange, onClose, onSave }: EditAdminModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit admin"
      placement="sheet"
      size="md"
      dismissible={!saving}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} loading={saving} loadingText="Saving…">
            Save changes
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField compact id="edit-admin-first-name" name="firstName" label="First name" type="text" disabled={saving} value={form.firstName} onChange={(e) => onChange({ ...form, firstName: e.target.value })} />
          <FormField compact id="edit-admin-last-name" name="lastName" label="Last name" type="text" disabled={saving} value={form.lastName} onChange={(e) => onChange({ ...form, lastName: e.target.value })} />
        </div>
        <FormField compact id="edit-admin-email" name="email" label="Email address (from their account)" type="email" readOnly disabled value={form.email} />
      </div>
    </Dialog>
  );
}
