import type { ComponentProps } from "react";
import Button from "../ui/Button";
import FormField from "../ui/FormField";
import Sheet from "../ui/Sheet";
import { inputClass } from "../ui/styles";

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
  onSave: () => void;
  onCancel: () => void;
}

// The details form, in a sheet. Same fields, validation and save as before; email stays locked.
export default function EditDetailsSheet(p: EditDetailsSheetProps) {
  return (
    <Sheet open={p.open} title="Edit details" onClose={p.onCancel}>
      <div className="flex flex-col gap-4">
        {p.error && <div className="rounded-sm border border-danger bg-danger/10 p-4 text-sm text-danger">{p.error}</div>}

        <div className="grid grid-cols-1 gap-4">
          {p.fields.map((field) => (
            <FormField key={field.id} {...field} editing />
          ))}

          <div className="flex flex-col gap-1">
            <p className="label-caps">Gender:</p>
            <div className="relative">
              <Button variant="bare" type="button" onClick={p.onToggleGender} className={`${inputClass} flex items-center justify-between text-left`}>
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
                <div className="absolute bottom-full z-10 mb-2 w-full overflow-hidden rounded-sm border border-crimson-light bg-light-orange py-1 shadow-xl shadow-crimson/20">
                  {p.genderOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => p.onSelectGender(option.value)}
                      className={`cursor-pointer px-4 py-4 font-sans transition-colors ${
                        p.genderValue === option.value ? "bg-crimson font-bold text-light-orange" : "text-gray-red hover:bg-crimson-light/50"
                      }`}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={p.onSave} className="w-full sm:w-auto">Save</Button>
          <Button type="button" variant="secondary" onClick={p.onCancel} className="w-full sm:w-auto">Cancel</Button>
        </div>
      </div>
    </Sheet>
  );
}
