import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged } from "../../lib/adminQueries";
import { uploadVisitPhoto } from "../../services/completionService";
import { usePhotoPick } from "./usePhotoPick";

/** The visit photo window: one photo, checked here, previewed, then uploaded */
export function useVisitPhoto(appointmentId: number, onDone?: () => void, label?: string) {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const pick = usePhotoPick();
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!pick.file) return;
    setBusy(true);
    try {
      await uploadVisitPhoto(appointmentId, pick.file, { token: await getToken(), clerkId: userId });
      toast.show("success", "Photo added", `${label ? `For ${label}. ` : ""}It's in the artist's gallery now.`);
      void adminDataChanged(queryClient);
      pick.choose(null);
      onDone?.();
    } catch (e) {
      pick.setError(e instanceof Error && e.message ? e.message : "The photo wasn't uploaded. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return { file: pick.file, preview: pick.preview, error: pick.error, busy, choose: pick.choose, upload, maxMb: pick.maxMb };
}
