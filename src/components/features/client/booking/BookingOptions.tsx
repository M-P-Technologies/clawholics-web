import { ChoiceRow } from "@/components/molecules";
import { field } from "@/components/tokens";

type Props = {
  /** The service's options: optional extras, each priced on top of the service */
  variants: { id: number; name: string; price: number }[];
  addons: { id: number; name: string; price: number }[];
  variantIds: number[];
  addonIds: number[];
  onVariantsChange: (ids: number[]) => void;
  onAddonsChange: (ids: number[]) => void;
};

// Pick any of the extras or none: each is added on top of the service price and paid at the salon
const toggle = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

export default function BookingOptions({ variants, addons, variantIds, addonIds, onVariantsChange, onAddonsChange }: Props) {
  if (variants.length === 0 && addons.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {variants.length > 0 && (
        <fieldset>
          <legend className={`mb-1 ${field.label}`}>Add-on options (optional)</legend>
          <p className="mb-3 text-sm text-gray-red">Add any you&apos;d like. They&apos;re paid at the salon; your deposit stays the same.</p>
          <div className="flex flex-col gap-3">
            {variants.map((variant) => (
              <ChoiceRow
                key={variant.id}
                kind="checkbox"
                selected={variantIds.includes(variant.id)}
                onClick={() => onVariantsChange(toggle(variantIds, variant.id))}
                trailing={`+₱${variant.price}`}
              >
                <span className="font-bold">{variant.name}</span>
              </ChoiceRow>
            ))}
          </div>
        </fieldset>
      )}

      {addons.length > 0 && (
        <fieldset>
          <legend className={`mb-3 ${field.label}`}>Add-ons</legend>
          <div className="flex flex-col gap-3">
            {addons.map((addon) => (
              <ChoiceRow
                key={addon.id}
                kind="checkbox"
                selected={addonIds.includes(addon.id)}
                onClick={() => onAddonsChange(toggle(addonIds, addon.id))}
                trailing={`+₱${addon.price}`}
              >
                <span className="font-bold">{addon.name}</span>
              </ChoiceRow>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
