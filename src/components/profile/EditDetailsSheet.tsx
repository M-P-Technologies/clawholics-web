import type { ComponentProps } from "react";
import { Button } from "@/components/atoms";
import FormField from "../ui/FormField";
import { Select } from "@/components/atoms";
import Sheet from "../ui/Sheet";

interface EditDetailsSheetProps {
  open: boolean;
  error: string | null;
  fields: ComponentProps<typeof FormField>[];
  genderLabel: string;
  genderOptions: { value: string; label: string }[];
  genderValue: string | undefined;
  isGenderOpen: boolean;
  onToggleGender: () => void;
  onSelectGender: (value: string) => void;
  /** How the client prefers to be reached; "" is no preference */
  contactMethod: string;
  contactMethodOptions: { value: string; label: string }[];
  onSelectContactMethod: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

// The details form, in a sheet. Same fields, validation and save as before; email stays locked.
export default function EditDetailsSheet(p: EditDetailsSheetProps) {
  return (
    <Sheet open={p.open} title="Edit details" onClose={p.onCancel}>
      <div className="flex flex-col gap-4">
        {p.error && <div role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-bold text-danger">{p.error}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {p.fields.map((field) => (
            <FormField key={field.id} {...field} editing compact />
          ))}

          <div className="flex flex-col gap-1">
            <p className="text-[12px] text-gray-red/70">Gender:</p>
            <div className="relative">
              <Button variant="bare" type="button" onClick={p.onToggleGender} className="flex w-full items-center justify-between rounded-md border border-crimson-light bg-milk px-3 py-2 text-left text-sm text-gray-red">
                <span className={p.genderLabel ? "" : "opacity-60"}>{p.genderLabel || "Select gender"}</span>
                <svg
                  className={`h-5 w-5 fill-current opacity-80 transition-transform duration-200 ${p.isGenderOpen ? "rotate-180" : ""}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </Button>

              {p.isGenderOpen && (
                <div className="absolute bottom-full z-10 mb-2 w-full overflow-hidden rounded-xl border border-crimson-light/60 bg-milk py-1 shadow-xl shadow-crimson/20">
                  {p.genderOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => p.onSelectGender(option.value)}
                      className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                        p.genderValue === option.value ? "bg-crimson-light/40 font-bold text-berry" : "text-gray-red hover:bg-crimson-light/25"
                      }`}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[12px] text-gray-red/70">Best way to reach you (optional):</p>
            <Select aria-label="Best way to reach you" value={p.contactMethod} options={p.contactMethodOptions} placeholder="No preference" onChange={(e) => p.onSelectContactMethod(e.target.value)} />
            <p className="text-[12px] text-gray-red/60">We use these only to reach you about your appointment.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-crimson-light/50 pt-4 sm:flex-row-reverse sm:justify-start">
          <Button type="button" onClick={p.onSave} className="w-full sm:w-auto">Save</Button>
          <Button type="button" variant="secondary" onClick={p.onCancel} className="w-full sm:w-auto">Cancel</Button>
        </div>
      </div>
    </Sheet>
  );
}
