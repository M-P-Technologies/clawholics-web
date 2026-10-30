"use client";

import { useState, type DragEvent } from "react";
import { ImageUp, X } from "lucide-react";
import clsx from "clsx";

interface VisitPhotoDropzoneProps {
  id: string;
  file: File | null;
  /** A local address for showing the picked photo */
  preview: string | null;
  error: string;
  maxMb: number;
  disabled?: boolean;
  onChoose: (file: File | null) => void;
}

// Where the visit's nail photo is dropped or picked: one photo, shown back once it's chosen
export default function VisitPhotoDropzone({ id, file, preview, error, maxMb, disabled = false, onChoose }: VisitPhotoDropzoneProps) {
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) onChoose(e.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={clsx(
          "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left text-gray-red transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-crimson",
          over ? "border-crimson bg-crimson-light/30" : "border-crimson-light bg-crimson-light/10 hover:bg-crimson-light/20",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Nail photo"
          disabled={disabled}
          onChange={(e) => {
            onChoose(e.target.files?.[0] ?? null);
            // The same photo can be chosen again after it was removed
            e.target.value = "";
          }}
          className="sr-only"
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file
          <img src={preview} alt="The photo to upload" className="h-16 w-16 shrink-0 rounded-lg border border-crimson-light/60 object-cover" />
        ) : (
          <ImageUp size={24} aria-hidden="true" className="shrink-0 text-crimson-ink" />
        )}
        <span className="min-w-0 flex-1 text-xs">
          {file ? (
            <>
              <span className="block truncate font-bold">{file.name}</span>
              <span className="block">Click or drop to choose another</span>
            </>
          ) : (
            <>
              <span className="block font-bold">Drop a photo here, or click to browse</span>
              <span className="block">JPG, PNG or WEBP, up to {maxMb} MB</span>
            </>
          )}
        </span>
      </label>
      {file && !disabled && (
        <button type="button" onClick={() => onChoose(null)} className="flex items-center gap-1 self-start text-xs font-bold text-crimson-ink underline underline-offset-2">
          <X size={12} aria-hidden="true" />
          Remove photo
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
