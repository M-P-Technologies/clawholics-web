import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/tanstack-query/publicQueries";

export function useTermsAndConditions() {
  const tacsQuery = useQuery(publicQueries.tacs());
  const tacs = tacsQuery.data ?? [];
  // A failed refresh keeps showing the copy already loaded
  const error = tacsQuery.isError && !tacsQuery.data;
  const loading = tacsQuery.isPending && !error;

  const reload = () => {
    void tacsQuery.refetch();
  };

  return { tacs, loading, error, reload };
}
