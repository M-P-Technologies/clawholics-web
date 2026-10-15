import { Check } from "lucide-react";
import clsx from "clsx";
import { PALETTES, googleFontsHref, type FontChoice } from "@/lib/siteTheme";
import { useGoogleFonts } from "@/hooks/useGoogleFonts";
import { fieldLabelClass } from "@/components/features/admin/cms/fields";

const cardClass = (chosen: boolean) =>
  clsx(
    "relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson",
    chosen ? "border-crimson bg-crimson-light/20" : "border-crimson-light/60 hover:border-crimson",
  );

const Chosen = () => (
  <span aria-hidden="true" className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-berry text-pearl">
    <Check size={12} strokeWidth={3} />
  </span>
);

// The site's colour set: each card shows its five colours
export function PalettePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={fieldLabelClass}>Colour set</span>
      <div role="radiogroup" aria-label="Colour set" className="grid grid-cols-2 gap-2">
        {PALETTES.map(({ key, label, colors }) => (
          <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)} className={cardClass(value === key)}>
            <span aria-hidden="true" className="flex overflow-hidden rounded-md border border-gray-red/10">
              {[colors.crimson, colors.crimsonLight, colors.lightOrange, colors.sand, colors.grayRed].map((color) => (
                <span key={color} className="h-6 flex-1" style={{ background: color }} />
              ))}
            </span>
            <span className="text-[13px] font-bold text-gray-red">{label}</span>
            {value === key && <Chosen />}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FontPickerProps {
  label: string;
  fonts: FontChoice[];
  value: string;
  onChange: (key: string) => void;
  /** What each option writes in its own font */
  sample: string;
  /** Bigger text for display and script fonts */
  size: "large" | "small";
}

// One kind of font (display, script or body): each option is written in its own font
export function FontPicker({ label, fonts, value, onChange, sample, size }: FontPickerProps) {
  // Load every option, so each card can show itself
  useGoogleFonts(googleFontsHref(fonts));
  return (
    <div className="flex flex-col gap-1.5">
      <span className={fieldLabelClass}>{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
        {fonts.map((font) => (
          <button key={font.key} type="button" role="radio" aria-checked={value === font.key} aria-label={font.label} onClick={() => onChange(font.key)} className={cardClass(value === font.key)}>
            <span className={size === "large" ? "pr-6 text-2xl leading-tight text-gray-red" : "pr-6 text-[15px] text-gray-red"} style={{ fontFamily: font.css }}>
              {sample}
            </span>
            <span className="text-[12px] text-gray-red">{font.label}</span>
            {value === font.key && <Chosen />}
          </button>
        ))}
      </div>
    </div>
  );
}
