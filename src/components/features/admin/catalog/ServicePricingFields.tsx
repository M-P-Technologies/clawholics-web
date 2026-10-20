import { Plus, Trash2 } from "lucide-react";
import type { ServiceCategory } from "@/services/catalogService";
import type { NailService } from "@/services/serviceService";
import { Button, IconButton, Select } from "@/components/atoms";

/** An option: an extra a client may add when booking, its price added to the service's. id is the saved option's. */
type VariantDraft = { id?: number; name: string; price: string };

export type PricingDraft = {
  categoryId: number | null;
  pricingType: "tiered" | "flat";
  masterPrice: string;
  juniorPrice: string;
  flatPrice: string;
  variants: VariantDraft[];
};

const toNumber = (value: string) => (value.trim() === "" ? 0 : Number(value));

export const emptyDraft = (): PricingDraft => ({
  categoryId: null,
  pricingType: "tiered",
  masterPrice: "",
  juniorPrice: "",
  flatPrice: "",
  variants: [],
});

export const draftFromService = (service?: NailService): PricingDraft => {
  if (!service) return emptyDraft();
  return {
    categoryId: service.category_id ?? null,
    pricingType: service.pricing_type ?? "tiered",
    masterPrice: service.master_price > 0 ? String(service.master_price) : "",
    juniorPrice: service.junior_price > 0 ? String(service.junior_price) : "",
    flatPrice: service.price > 0 ? String(service.price) : "",
    variants: (service.variants ?? []).map((v) => ({ id: v.id, name: v.name, price: String(v.price) })),
  };
};

export const validateDraft = (draft: PricingDraft): string | null => {
  if (!draft.categoryId) return "Please choose a category.";

  for (const v of draft.variants) {
    if (!v.name.trim() || !(Number(v.price) > 0)) {
      return "Every option needs a name and an extra price above 0.";
    }
  }

  // Options are extras on top of the service's price, so the service needs its own
  if (draft.pricingType === "tiered") {
    if (toNumber(draft.masterPrice) <= 0 && toNumber(draft.juniorPrice) <= 0) {
      return "Set a price for at least one technician tier.";
    }
  } else if (toNumber(draft.flatPrice) <= 0) {
    return "Set the service's price.";
  }
  return null;
};

export const payloadFromDraft = (draft: PricingDraft) => ({
  pricing_type: draft.pricingType,
  master_price: draft.pricingType === "tiered" ? toNumber(draft.masterPrice) : 0,
  junior_price: draft.pricingType === "tiered" ? toNumber(draft.juniorPrice) : 0,
  price: draft.pricingType === "flat" ? toNumber(draft.flatPrice) : 0,
  variants: draft.variants.map((v) => ({ ...(v.id ? { id: v.id } : {}), name: v.name.trim(), price: Number(v.price) })),
});

type Props = {
  draft: PricingDraft;
  onChange: (draft: PricingDraft) => void;
  isEditing: boolean;
  categories: ServiceCategory[];
};

const card = "flex flex-col gap-1.5";
const fieldClass =
  "w-full rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none focus:ring-2 focus:ring-crimson disabled:cursor-not-allowed disabled:opacity-70";
const optionLabelClass = "flex flex-col gap-1 text-xs font-medium text-gray-red";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className={card}>
    <h3 className="text-[13px] font-medium text-gray-red">{label}</h3>
    {children}
  </div>
);

export default function ServicePricingFields({ draft, onChange, isEditing, categories }: Props) {
  const set = (patch: Partial<PricingDraft>) => onChange({ ...draft, ...patch });
  const digits = (value: string) => value.replace(/[^0-9]/g, "");
  const setVariant = (index: number, patch: Partial<VariantDraft>) =>
    set({ variants: draft.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) });

  return (
    <>
      <Field label="Category">
        <Select
          aria-label="Category"
          disabled={!isEditing}
          value={draft.categoryId ?? ""}
          onChange={(e) => set({ categoryId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Pricing type">
        <Select
          aria-label="Pricing type"
          disabled={!isEditing}
          value={draft.pricingType}
          onChange={(e) => set({ pricingType: e.target.value as "tiered" | "flat" })}
        >
          <option value="tiered">By technician tier (Master / Junior)</option>
          <option value="flat">One price for everyone</option>
        </Select>
      </Field>

      {draft.pricingType === "tiered" ? (
        <>
          <Field label="Master Technician Price">
            <input
              aria-label="Master Technician Price"
              placeholder="Leave empty if Master does not offer this"
              disabled={!isEditing}
              inputMode="numeric"
              value={draft.masterPrice}
              onChange={(e) => set({ masterPrice: digits(e.target.value) })}
              className={fieldClass}
            />
          </Field>
          <Field label="Junior Technician Price">
            <input
              aria-label="Junior Technician Price"
              placeholder="Leave empty if Junior does not offer this"
              disabled={!isEditing}
              inputMode="numeric"
              value={draft.juniorPrice}
              onChange={(e) => set({ juniorPrice: digits(e.target.value) })}
              className={fieldClass}
            />
          </Field>
        </>
      ) : (
        <Field label="Price">
          <input
            aria-label="Price"
            placeholder="e.g. 650"
            disabled={!isEditing}
            inputMode="numeric"
            value={draft.flatPrice}
            onChange={(e) => set({ flatPrice: digits(e.target.value) })}
            className={fieldClass}
          />
        </Field>
      )}

      <fieldset className="flex flex-col gap-3 rounded-lg border border-crimson-light p-3">
        <legend className="px-1 text-[13px] font-medium text-gray-red">Add-on options (optional)</legend>
        <p className="text-sm text-gray-red">
          Extras a client can add when booking, for example &quot;Chrome finish&quot; for ₱150. Each one&apos;s price is added on
          top of the service price and paid at the salon; the booking deposit stays the same.
        </p>

        {draft.variants.length === 0 ? (
          <p className="text-sm text-gray-red">No options yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {draft.variants.map((variant, index) => (
              <li key={variant.id ?? `new-${index}`} className="flex items-end gap-2">
                <label className={`min-w-0 flex-1 ${optionLabelClass}`}>
                  Option name
                  <input
                    aria-label={`Option ${index + 1} name`}
                    placeholder="e.g. Chrome finish"
                    className={fieldClass}
                    disabled={!isEditing}
                    value={variant.name}
                    onChange={(e) => setVariant(index, { name: e.target.value })}
                  />
                </label>
                <label className={`w-28 flex-none ${optionLabelClass}`}>
                  Extra price
                  <span className="relative">
                    <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-red">
                      +₱
                    </span>
                    <input
                      aria-label={`Option ${index + 1} extra price`}
                      placeholder="150"
                      className={`${fieldClass} pl-8`}
                      disabled={!isEditing}
                      inputMode="numeric"
                      value={variant.price}
                      onChange={(e) => setVariant(index, { price: digits(e.target.value) })}
                    />
                  </span>
                </label>
                {isEditing && (
                  <IconButton
                    icon={Trash2}
                    label={`Remove option ${index + 1}`}
                    onClick={() => set({ variants: draft.variants.filter((_, i) => i !== index) })}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {isEditing && (
          <Button
            variant="secondary"
            type="button"
            className="self-start"
            onClick={() => set({ variants: [...draft.variants, { name: "", price: "" }] })}
          >
            <Plus size={16} aria-hidden="true" /> Add option
          </Button>
        )}
      </fieldset>
    </>
  );
}
