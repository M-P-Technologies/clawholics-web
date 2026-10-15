import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { readTeamPage } from "../lib/homeSections";
import { usePagination } from "./usePagination";
import { usePhotoStrip } from "./usePhotoStrip";

export function useTeam() {
  const nailistsQuery = useQuery(publicQueries.nailists());
  const teamQuery = useQuery(publicQueries.team());
  const nailists = nailistsQuery.data ?? [];
  const teamContent = teamQuery.data ?? null;
  // The page needs both; a failed refresh keeps showing the copy already loaded
  const error = (nailistsQuery.isError && !nailistsQuery.data) || (teamQuery.isError && !teamQuery.data);
  const loading = !error && (nailistsQuery.isPending || teamQuery.isPending);

  const reload = () => {
    void nailistsQuery.refetch();
    void teamQuery.refetch();
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
