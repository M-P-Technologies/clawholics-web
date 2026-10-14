import type { AdminEditForm } from "../../hooks/admin/useAdminDirectory";
import { Button, LoadingBar } from "@/components/atoms";

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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
      <div className="bg-milk border border-crimson-light/40 flex flex-col gap-4 rounded-2xl p-4 md:gap-8 md:p-8 max-w-md w-full text-gray-red shadow-xl transition-all drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
        {saving ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingBar inline />
          </div>
        ) : (
          <>
            <h1 className="text-3xl text-center font-display">EDIT ADMIN</h1>

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
      </div>
    </div>
  );
}
