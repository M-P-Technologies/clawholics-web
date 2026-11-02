import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { readTermsPage } from "../lib/homeSections";

export function useTermsAndConditions() {
  const tacsQuery = useQuery(publicQueries.tacs());
  const tacs = tacsQuery.data ?? [];
  // A failed refresh keeps showing the copy already loaded
  const error = tacsQuery.isError && !tacsQuery.data;
  const loading = tacsQuery.isPending && !error;

  // The page's heading (Admin > Terms & Conditions); its default until the home content loads
  const heading = readTermsPage(useQuery(publicQueries.home()).data).home_terms_title;

  const reload = () => {
    void tacsQuery.refetch();
  };

  return { tacs, heading, loading, error, reload };
}
