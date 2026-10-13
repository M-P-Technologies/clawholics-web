import type { ServiceCategory } from "../../services/catalogService";
import type { NailService } from "../../services/serviceService";
import Button from "../ui/Button";
import Select from "../ui/Select";

export type VariantDraft = { name: string; price: string };

const variantInputClass =
  "min-w-0 flex-1 bg-milk rounded-md px-4 py-1.5 text-[16px] text-gray-red outline-none focus:ring-2 focus:ring-crimson disabled:opacity-70 border border-crimson-light";

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
    variants: (service.variants ?? []).map((v) => ({ name: v.name, price: String(v.price) })),
  };
};

export const validateDraft = (draft: PricingDraft): string | null => {
  if (!draft.categoryId) return "Please choose a category.";

  for (const v of draft.variants) {
    if (!v.name.trim() || !(Number(v.price) > 0)) {
      return "Every option needs a name and a price above 0.";
    }
  }

  if (draft.pricingType === "tiered") {
    if (toNumber(draft.masterPrice) <= 0 && toNumber(draft.juniorPrice) <= 0 && draft.variants.length === 0) {
      return "Set a price for at least one technician tier.";
    }
  } else if (toNumber(draft.flatPrice) <= 0 && draft.variants.length === 0) {
    return "Set a price or at least one option.";
  }
  return null;
};

export const payloadFromDraft = (draft: PricingDraft) => ({
  pricing_type: draft.pricingType,
  master_price: draft.pricingType === "tiered" ? toNumber(draft.masterPrice) : 0,
  junior_price: draft.pricingType === "tiered" ? toNumber(draft.juniorPrice) : 0,
  price: draft.pricingType === "flat" ? toNumber(draft.flatPrice) : 0,
  variants: draft.variants.map((v) => ({ name: v.name.trim(), price: Number(v.price) })),
});

type Props = {
  draft: PricingDraft;
  onChange: (draft: PricingDraft) => void;
  isEditing: boolean;
  categories: ServiceCategory[];
};

const card = "rounded-xl bg-crimson-light/15 px-4 py-2";
const fieldClass =
  "w-full min-h-[32px] mt-1 outline-none text-[16px] text-gray-red bg-transparent disabled:cursor-not-allowed";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className={card}>
    <h3 className="text-[17px] tracking-wide text-gray-red mb-2">{label}</h3>
    <div className="w-full h-[1.5px] bg-crimson mb-1" />
    {children}
  </div>
);

export default function ServicePricingFields({ draft, onChange, isEditing, categories }: Props) {
  const set = (patch: Partial<PricingDraft>) => onChange({ ...draft, ...patch });
  const digits = (value: string) => value.replace(/[^0-9]/g, "");

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
            placeholder="Leave empty when you use options"
            disabled={!isEditing}
            inputMode="numeric"
            value={draft.flatPrice}
            onChange={(e) => set({ flatPrice: digits(e.target.value) })}
            className={fieldClass}
          />
        </Field>
      )}

      <div className="rounded-xl bg-crimson-light/15 px-4 py-2">
        <h3 className="text-[17px] tracking-wide text-gray-red mb-2">Options (optional)</h3>
        <div className="w-full h-[1.5px] bg-crimson mb-4" />
        <p className="text-[14px] text-gray-red/80 mb-2">
          Use options when a service has several fully priced choices, for example "Cat Eye - Volume" and "Cat Eye - Mega Volume". Clients must pick one.
        </p>

        <div className="flex flex-col gap-2">
          {draft.variants.map((variant, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                aria-label={`Option ${index + 1} name`}
                className={variantInputClass}
                disabled={!isEditing}
                value={variant.name}
                onChange={(e) => set({ variants: draft.variants.map((v, i) => (i === index ? { ...v, name: e.target.value } : v)) })}
              />
              <input
                aria-label={`Option ${index + 1} price`}
                className={`${variantInputClass} max-w-[110px] flex-none`}
                disabled={!isEditing}
                inputMode="numeric"
                value={variant.price}
                onChange={(e) => set({ variants: draft.variants.map((v, i) => (i === index ? { ...v, price: digits(e.target.value) } : v)) })}
              />
              {isEditing && (
                <Button
                  variant="secondary"
                  type="button"
                  aria-label={`Remove option ${index + 1}`}
                  
                  onClick={() => set({ variants: draft.variants.filter((_, i) => i !== index) })}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        {isEditing && (
          <Button
            variant="secondary"
            type="button"
            className="mt-4"
            onClick={() => set({ variants: [...draft.variants, { name: "", price: "" }] })}
          >
            Add option
          </Button>
        )}
      </div>
    </>
  );
}
