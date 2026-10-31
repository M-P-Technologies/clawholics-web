"use client";

import { useState, type ReactNode } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import clsx from "clsx";

export const IMAGE_ACCEPT = "image/png, image/jpeg, image/webp";

interface DropAreaProps {
  id: string;
  uploading?: boolean;
  disabled?: boolean;
  /** One photo, from a click or a drop */
  onFile?: (file?: File) => void;
  /** Several photos at once (set `multiple`): every file that was dropped */
  onFiles?: (files: FileList) => void;
  /** The caller's own file input (with this `id`); without it the area draws one */
  input?: ReactNode;
  accept?: string;
  multiple?: boolean;
  /** The name screen readers give the file input */
  inputLabel?: string;
  label?: string;
  /** The small line under the label */
  hint?: ReactNode;
}

/**
 * The one place a file is dropped or picked: a dashed area that takes a photo (or, with `onFiles`, several) by
 * click, tap or drop. Callers show the chosen file (preview, name, Remove) themselves.
 */
export function DropArea({ id, uploading = false, disabled = false, onFile, onFiles, input, accept = IMAGE_ACCEPT, multiple, inputLabel, label = "Upload a photo", hint = "PNG, JPG or WebP. Click, or drop it here." }: DropAreaProps) {
  const [over, setOver] = useState(false);
  const locked = uploading || disabled;
  const take = (files: FileList | null | undefined) => {
    if (locked || !files?.length) return;
    if (onFiles) onFiles(files);
    else onFile?.(files[0]);
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!locked) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={clsx(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-crimson",
        over ? "border-crimson bg-crimson-light/30" : "border-crimson-light",
        uploading ? "cursor-wait opacity-70" : disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-crimson hover:bg-crimson-light/15",
      )}
    >
      <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-crimson-light/40 text-berry">
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
      </span>
      <span className="text-[13px] font-bold text-gray-red">{uploading ? "Uploading…" : label}</span>
      {!uploading && <span className="text-xs text-gray-red">{hint}</span>}
      {input ?? (
        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          aria-label={inputLabel}
          disabled={locked}
          className="sr-only"
          onChange={(e) => {
            take(e.target.files);
            e.target.value = "";
          }}
        />
      )}
    </label>
  );
}

export default DropArea;
