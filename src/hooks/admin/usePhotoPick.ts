import { useEffect, useState } from "react";
import { MAX_VISIT_PHOTO_MB } from "../../services/completionService";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** One photo picked or dropped, checked here and previewed, not yet uploaded */
export function usePhotoPick() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  // The preview's address is let go once it's no longer shown
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (picked: File | null) => {
    setFile(null);
    setPreview(null);
    if (!picked) return setError("");
    if (!TYPES.includes(picked.type)) return setError("Choose a JPG, PNG or WEBP photo.");
    if (picked.size > MAX_VISIT_PHOTO_MB * 1024 * 1024) return setError(`Choose a photo of ${MAX_VISIT_PHOTO_MB} MB or smaller.`);
    setError("");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  return { file, preview, error, setError, choose, maxMb: MAX_VISIT_PHOTO_MB };
}
