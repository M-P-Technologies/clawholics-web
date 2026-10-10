import { useEffect, useState } from "react";
import { fetchTacs, type Tac } from "../services/tacService";

export function useTermsAndConditions() {
  const [tacs, setTacs] = useState<Tac[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(false);
    fetchTacs()
      .then((data) => setTacs(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [attempt]);

  const reload = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return { tacs, loading, error, reload };
}
