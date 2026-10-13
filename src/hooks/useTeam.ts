import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
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

  return { photos, instagram, error, reload, nailists, teamContent, loading };
}
