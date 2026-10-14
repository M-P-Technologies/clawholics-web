import { ChoiceRow } from "@/components/molecules";

type Props = {
  variants: { id: number; name: string; price: number }[];
  addons: { id: number; name: string; price: number }[];
  variantId: number | null;
  addonIds: number[];
  onVariantChange: (id: number) => void;
  onAddonsChange: (ids: number[]) => void;
};

export default function BookingOptions({ variants, addons, variantId, addonIds, onVariantChange, onAddonsChange }: Props) {
  if (variants.length === 0 && addons.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 md:gap-8">
      {variants.length > 0 && (
        <fieldset>
          <legend className="mb-4 label-caps">CHOOSE AN OPTION</legend>
          <div className="flex flex-col gap-2">
            {variants.map((variant) => (
              <ChoiceRow
                key={variant.id}
                selected={variantId === variant.id}
                onClick={() => onVariantChange(variant.id)}
                trailing={`₱${variant.price}`}
              >
                <span className="font-bold">{variant.name}</span>
              </ChoiceRow>
            ))}
          </div>
        </fieldset>
      )}

      {addons.length > 0 && (
        <fieldset>
          <legend className="mb-4 label-caps">ADD-ONS</legend>
          <div className="flex flex-col gap-2">
            {addons.map((addon) => {
              const checked = addonIds.includes(addon.id);
              return (
                <ChoiceRow
                  key={addon.id}
                  kind="checkbox"
                  selected={checked}
                  onClick={() => onAddonsChange(checked ? addonIds.filter((id) => id !== addon.id) : [...addonIds, addon.id])}
                  trailing={`+₱${addon.price}`}
                >
                  <span className="font-bold">{addon.name}</span>
                </ChoiceRow>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
