import { usePreviewVersion } from "@/lib/cmsPreview";
import { useEffect, useState } from "react";
import { fetchTacs, type Tac } from "../services/tacService";

export function useTermsAndConditions() {
  const [tacs, setTacs] = useState<Tac[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();

  useEffect(() => {
    setError(false);
    fetchTacs()
      .then((data) => setTacs(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [attempt, previewVersion]);

  const reload = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return { tacs, loading, error, reload };
}
