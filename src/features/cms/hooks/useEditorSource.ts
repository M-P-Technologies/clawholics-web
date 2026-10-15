"use client";


import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { ADMIN } from "../../../lib/tanstack-query/adminQueries";
import { useFillForm } from "./useFillForm";

interface EditorSourceOptions<T> {
  /** Under the editor's own name: [ADMIN, "editor", name] */
  name: string;
  /** Loads the saved copy the form starts from */
  load: () => Promise<T>;
  /** The form has changes not saved yet: a newer copy from the server must not replace them */
  dirty: boolean;
  /** Fills the form with the saved copy */
  onLoad: (saved: T) => void;
}

/**
 * The saved copy a content editor's form starts from, as a cached admin query: coming back to
 * the editor shows it at once (and refreshes it behind it). The form is filled when it arrives,
 * and again when a newer copy does while there's nothing unsaved. After a save, `saved` stores
 * what was saved as the cached copy.
 */
export function useEditorSource<T>({ name, load, dirty, onLoad }: EditorSourceOptions<T>) {
  const queryClient = useQueryClient();
  const queryKey: QueryKey = [ADMIN, "editor", name];
  // Fetched again each time the editor opens: the cached copy only shows meanwhile
  const query = useQuery({ queryKey, queryFn: load, refetchOnMount: "always" });
  const filledWith = useFillForm(query.data, dirty, onLoad);

  return {
    isLoading: query.isPending,
    /** Nothing could be loaded (a failed refresh keeps the copy already shown) */
    failed: query.isError && query.data === undefined,
    error: query.data === undefined ? query.error : null,
    retry: () => void query.refetch(),
    /** Keeps what was just saved as the cached copy (the form already shows it) */
    saved: (data: T) => {
      filledWith(data);
      queryClient.setQueryData(queryKey, data);
    },
  };
}
