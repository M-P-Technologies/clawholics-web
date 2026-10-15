import { usePreviewVersion } from "@/lib/cmsPreview";
import { lastSeen } from "../utils/lastSeen";
import { useEffect, useRef, useState } from "react";
import type { Nailist } from "../services/nailistService";
import { fetchTeamContent } from "../services/contentService";
import type { TeamContent } from "../types";
import { fetchNailists } from "../services/nailistService";
import { readTeamPage } from "../lib/homeSections";
import { usePagination } from "./usePagination";
import { usePhotoStrip } from "./usePhotoStrip";

export function useTeam() {
  const [nailists, setNailists] = useState<Nailist[]>(() => lastSeen("nailists") ?? []);
  const [teamContent, setTeamContent] = useState<TeamContent | null>(() => lastSeen("team") ?? null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();
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
  }, [attempt, previewVersion]);

  const reload = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  // "Their art": the work each artist uploaded to their gallery
  const { photos, instagram } = usePhotoStrip(nailists.map((n) => n.id));

  // 9 artists a page; a new page scrolls back to the top of the list
  const { page, setPage, totalPages, pageItems } = usePagination(nailists);
  const listRef = useRef<HTMLDivElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // The heading, intro and strip title, as edited in Admin > Artists (or the defaults)
  const words = teamContent ? readTeamPage(teamContent) : null;

  return { photos, instagram, error, reload, nailists, words, loading, page, totalPages, pageItems, listRef, goToPage };
}
