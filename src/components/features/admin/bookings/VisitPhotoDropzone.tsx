"use client";

import { X } from "lucide-react";
import { DropArea } from "@/components/molecules/DropArea";

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

// Where the visit's photo is dropped or picked: one photo, shown back once it's chosen
export default function VisitPhotoDropzone({ id, file, preview, error, maxMb, disabled = false, onChoose }: VisitPhotoDropzoneProps) {
  return (
    <div className="flex flex-col gap-2">
      <DropArea
        id={id}
        disabled={disabled}
        inputLabel="Visit photo"
        label={file ? "Choose another photo" : "Add a photo"}
        hint={`JPG, PNG or WEBP, up to ${maxMb} MB. Click, or drop it here.`}
        onFile={(f) => onChoose(f ?? null)}
      />
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-crimson-light/60 bg-milk px-3 py-2">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file
            <img src={preview} alt="The photo to upload" className="h-12 w-12 shrink-0 rounded-md object-cover" />
          )}
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-red">{file.name}</span>
          {!disabled && (
            <button type="button" onClick={() => onChoose(null)} className="flex shrink-0 items-center gap-1 text-xs font-bold text-crimson-ink underline underline-offset-2">
              <X size={12} aria-hidden="true" />
              Remove photo
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
