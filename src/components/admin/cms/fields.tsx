import { ArrowUpRight, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useId, type ComponentType, type ReactNode } from "react";
import clsx from "clsx";
import { Button, Select } from "@/components/atoms";
import { Link } from "../../../lib/router";
import { field } from "../../tokens";
import { useCmsEditor } from "./CmsEditor";

// The controls in a content editor's side panel, in the same look as the rest of the admin:
// small grey labels, bordered milk inputs, display-font section headings.

export const fieldClass = field.input;
export const fieldLabelClass = field.label;

interface PanelSectionProps {
  title: string;
  description?: ReactNode;
  /** The page this section changes: working in the section shows it in the preview */
  page?: string;
  /** Beside the title, e.g. a count */
  aside?: ReactNode;
  children: ReactNode;
}

// One group of controls, divided from the next by a line
export function PanelSection({ title, description, page, aside, children }: PanelSectionProps) {
  const { showPage } = useCmsEditor();
  const show = () => page && showPage(page);
  return (
    <section aria-label={title} onFocusCapture={show} onPointerDownCapture={show} className="flex flex-col gap-4 border-b border-crimson-light/40 px-4 py-5 last:border-b-0 sm:px-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-normal text-gray-red">{title}</h2>
          {aside && <span className="shrink-0 text-[12px] font-bold text-gray-red/70">{aside}</span>}
        </div>
        {description && <p className="text-[13px] leading-snug text-gray-red/70">{description}</p>}
      </div>
      {children}
    </section>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** A text area of this many rows instead of a one-line input */
  rows?: number;
  hint?: ReactNode;
  placeholder?: string;
  type?: "text" | "email" | "url" | "tel";
  disabled?: boolean;
}

export function TextField({ label, value, onChange, rows, hint, placeholder, type = "text", disabled }: TextFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      {rows ? (
        <textarea id={id} rows={rows} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={clsx(fieldClass, "resize-y leading-relaxed")} />
      ) : (
        <input id={id} type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
      )}
      {hint && <p className="text-[12px] leading-snug text-gray-red/60">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <Select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} options={options} />
    </div>
  );
}

const WEB_ADDRESS = "__web-address";

interface LinkFieldProps {
  label: string;
  value: string;
  /** The pages of the site it can open */
  pages: { value: string; label: string }[];
  onChange: (value: string) => void;
}

// Where a button goes: a page of the site, or "A web address" with a field for it (e.g. Facebook)
export function LinkField({ label, value, pages, onChange }: LinkFieldProps) {
  const custom = !pages.some((page) => page.value === value);
  return (
    <>
      <SelectField
        label={label}
        value={custom ? WEB_ADDRESS : value}
        options={[...pages, { value: WEB_ADDRESS, label: "A web address…" }]}
        onChange={(next) => onChange(next === WEB_ADDRESS ? (custom ? value : "https://") : next)}
      />
      {custom && <TextField label="Web address" type="url" value={value} onChange={onChange} placeholder="https://…" hint="Opens in a new tab." />}
    </>
  );
}

// A bordered group inside a section, e.g. one card's or one button's fields
export function SubCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-3">
      <p className="text-[13px] font-bold text-gray-red">{title}</p>
      {children}
    </div>
  );
}

interface IconPickerProps {
  label: string;
  value: string;
  /** Lucide icons, or the brand icons in atoms/SocialIcons */
  icons: { key: string; label: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> }[];
  onChange: (key: string) => void;
}

// A grid of icons to choose one from
export function IconPicker({ label, value, icons, onChange }: IconPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={fieldLabelClass}>{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-1.5">
        {icons.map(({ key, label: name, Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            aria-label={name}
            title={name}
            onClick={() => onChange(key)}
            className={clsx(
              "flex aspect-square items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson",
              value === key ? "border-crimson bg-crimson-light/40 text-berry" : "border-crimson-light/60 text-gray-red/70 hover:border-crimson hover:text-crimson",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}

interface ImageFieldProps {
  label: string;
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  hint?: ReactNode;
  /** Shown when nothing is uploaded, e.g. the built-in logo; Remove then goes back to it */
  fallback?: string;
  /** How the thumbnail fits: cover (photos) or contain (logos) */
  fit?: "cover" | "contain";
}

const ACCEPT = "image/png, image/jpeg, image/webp";

// A photo: its thumbnail with Replace and Remove, or a drop area to upload one
export function ImageField({ label, value, uploading, onUpload, onRemove, hint, fallback, fit = "cover" }: ImageFieldProps) {
  const shown = value || fallback;
  const id = useId();
  const pick = (file?: File) => file && onUpload(file);
  const input = (
    <input
      id={id}
      type="file"
      accept={ACCEPT}
      disabled={uploading}
      className="sr-only"
      onChange={(e) => {
        pick(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className={fieldLabelClass}>{label}</span>
      {shown ? (
        <div className="flex flex-col gap-2">
          <div className="relative overflow-hidden rounded-lg border border-crimson-light/60 bg-crimson-light/20">
            {/* eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS like the rest of the admin */}
            <img src={shown} alt={label} className={clsx("aspect-video w-full", fit === "contain" ? "object-contain p-2" : "object-cover")} />
            {!value && (
              <span className="absolute left-2 top-2 rounded-full bg-milk/90 px-2 py-0.5 text-[11px] font-bold text-gray-red">Default</span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-milk/70 text-[13px] font-bold text-gray-red">
                <Loader2 size={16} aria-hidden="true" className="mr-2 animate-spin" />
                Uploading…
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <label
              htmlFor={id}
              className={clsx(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-crimson-light px-3 py-1.5 text-[13px] font-bold text-gray-red transition-colors hover:bg-crimson-light/30 focus-within:ring-2 focus-within:ring-crimson",
                uploading && "pointer-events-none opacity-50",
              )}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Replace
              {input}
            </label>
            {value && (
              <Button type="button" variant="bare" onClick={onRemove} disabled={uploading} className="gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-bold text-danger hover:bg-danger/10">
                <Trash2 size={14} aria-hidden="true" />
                {fallback ? "Use the default" : "Remove"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <DropArea id={id} uploading={uploading} onFile={pick} input={input} />
      )}
      {hint && <p className="text-[12px] leading-snug text-gray-red/60">{hint}</p>}
    </div>
  );
}

// A dashed area that takes a photo by click or drop
export function DropArea({ id, uploading, onFile, input, label = "Upload a photo" }: { id: string; uploading: boolean; onFile: (file?: File) => void; input: ReactNode; label?: string }) {
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!uploading) onFile(e.dataTransfer.files?.[0]);
      }}
      className={clsx(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-crimson-light px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-crimson",
        uploading ? "cursor-wait opacity-70" : "cursor-pointer hover:border-crimson hover:bg-crimson-light/15",
      )}
    >
      <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-crimson-light/40 text-berry">
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
      </span>
      <span className="text-[13px] font-bold text-gray-red">{uploading ? "Uploading…" : label}</span>
      {!uploading && <span className="text-[12px] text-gray-red/60">PNG, JPG or WebP. Click, or drop it here.</span>}
      {input}
    </label>
  );
}

interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  /** Locks Save for another reason, e.g. a photo still uploading */
  busy?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

// The panel's top bar: whether there are unsaved changes, with Discard and Save
export function SaveBar({ dirty, saving, busy = false, onSave, onDiscard }: SaveBarProps) {
  useUnsavedWarning(dirty);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crimson-light/40 px-4 py-3 sm:px-5">
      <p role="status" className="flex items-center gap-2 text-[13px] font-medium text-gray-red/80">
        <span aria-hidden="true" className={clsx("h-2 w-2 rounded-full", dirty ? "bg-crimson" : "bg-success")} />
        {dirty ? "Unsaved changes" : "Live on the site"}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onDiscard} disabled={!dirty || saving} className="px-4! py-1.5! text-[13px]">
          Discard
        </Button>
        <Button type="button" onClick={onSave} loading={saving} loadingText="Saving…" disabled={!dirty || busy} className="px-4! py-1.5! text-[13px]">
          Save
        </Button>
      </div>
    </div>
  );
}

// The panel's top bar for editors whose items save one at a time
export function ItemsNote({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-crimson-light/40 px-4 py-3 text-[13px] leading-snug text-gray-red/70 sm:px-5">{children}</p>
  );
}

/** Asks before leaving the page while there are unsaved changes */
function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

// A block of the page that's edited on another screen, with a link there
export function ElsewhereNote({ to, screen, children }: { to: string; screen: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl bg-crimson-light/20 p-3 text-[13px] leading-snug text-gray-red">
      <p className="text-[13px] leading-snug">{children}</p>
      <Link to={to} className="inline-flex items-center gap-1 font-bold text-berry underline underline-offset-4">
        Edit in {screen}
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
