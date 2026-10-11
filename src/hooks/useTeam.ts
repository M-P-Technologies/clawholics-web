import { lastSeen } from "../utils/lastSeen";
import { useEffect, useState } from "react";
import type { Nailist } from "../services/nailistService";
import { fetchTeamContent } from "../services/contentService";
import type { TeamContent } from "../types";
import { fetchNailists } from "../services/nailistService";
import { usePhotoStrip } from "./usePhotoStrip";

export function useTeam() {
  const [nailists, setNailists] = useState<Nailist[]>(() => lastSeen("nailists") ?? []);
  const [teamContent, setTeamContent] = useState<TeamContent | null>(() => lastSeen("team") ?? null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(() => !(lastSeen("nailists") && lastSeen("team")));

  useEffect(() => {
    setError(false);

    Promise.all([fetchNailists(), fetchTeamContent()])
      .then(([nailistsData, teamData]) => {
        if (!Array.isArray(nailistsData)) throw new Error("Unexpected artist list");
        setNailists(nailistsData);
        setTeamContent(teamData);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [attempt]);

  const reload = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  const { photos, instagram } = usePhotoStrip();

  return { photos, instagram, error, reload, nailists, teamContent, loading };
}
