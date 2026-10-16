import { useState, type SyntheticEvent } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/atoms";
import { FormField } from "@/components/molecules";
import { Dialog } from "@/components/organisms";

type AddAdminFormData = {
  email: string;
};

interface AddAdminModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddAdminFormData) => void;
  isSaving?: boolean;
}

// Promotes an existing account to admin by its email, drawn like the admin's other dialogs: the
// title and close button, the field, and Cancel and Make admin in the footer
export default function AddAdminModal({ open, onClose, onSubmit, isSaving = false }: AddAdminModalProps) {
  const [email, setEmail] = useState("");

  if (!open) return null;

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ email });
    setEmail("");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add admin"
      placement="sheet"
      size="md"
      dismissible={!isSaving}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="add-admin-form" loading={isSaving} loadingText="Adding…">
            <UserPlus size={16} aria-hidden="true" />
            Make admin
          </Button>
        </div>
      }
    >
      <form id="add-admin-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-gray-red">
          Give an existing account admin access. They need to have signed up on the site first.
        </p>
        <FormField
          compact
          id="adminEmail"
          name="adminEmail"
          label="Their email address"
          type="email"
          autoComplete="email"
          required
          disabled={isSaving}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </form>
    </Dialog>
  );
}
