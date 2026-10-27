import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged } from "../../lib/adminQueries";
import { MAX_VISIT_PHOTO_MB, uploadVisitPhoto } from "../../services/completionService";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** The visit photo window: one photo, checked here, previewed, then uploaded */
export function useVisitPhoto(appointmentId: number, onDone?: () => void, label?: string) {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadVisitPhoto(appointmentId, file, { token: await getToken(), clerkId: userId });
      toast.show("success", "Photo added", `${label ? `For ${label}. ` : ""}It's in the artist's gallery now.`);
      void adminDataChanged(queryClient);
      setFile(null);
      setPreview(null);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The photo wasn't uploaded. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return { file, preview, error, busy, choose, upload, maxMb: MAX_VISIT_PHOTO_MB };
}
