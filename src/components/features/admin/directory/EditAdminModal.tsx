import type { AdminEditForm } from "@/hooks/admin/useAdminDirectory";
import { Button, LoadingBar } from "@/components/atoms";
import { Dialog } from "@/components/organisms";

interface EditAdminModalProps {
  open: boolean;
  form: AdminEditForm;
  saving: boolean;
  onChange: (form: AdminEditForm) => void;
  onClose: () => void;
  onSave: () => void;
}

const inputClass = "w-full bg-milk border border-crimson-light rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-crimson";
const labelClass = "block text-sm opacity-80 mb-1 ml-2";

// Edits an admin's name; the email is the account's, so it only shows
export default function EditAdminModal({ open, form, saving, onChange, onClose, onSave }: EditAdminModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit admin"
      placement="sheet"
      size="md"
      dismissible={!saving}
      header={saving ? <span className="sr-only">Edit admin</span> : <h1 className="text-3xl text-center font-display">EDIT ADMIN</h1>}
    >
      {saving ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingBar inline />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 font-sans">
            <div>
              <label className={labelClass}>First Name</label>
              <input type="text" value={form.firstName} onChange={(e) => onChange({ ...form, firstName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input type="text" value={form.lastName} onChange={(e) => onChange({ ...form, lastName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={form.email}
                readOnly
                disabled
                className="w-full bg-crimson/10 border border-crimson/20 text-gray-red/60 rounded-md px-4 py-2 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-center gap-4 font-sans">
            <Button
              variant="bare"
              onClick={onClose}
              className="px-8 py-2 text-[16px] rounded-md border border-crimson font-bold hover:scale-105 transition-colors hover:bg-light-orange"
            >
              Cancel
            </Button>
            <Button onClick={onSave} loading={saving} loadingText="Saving...">
              Save Changes
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
