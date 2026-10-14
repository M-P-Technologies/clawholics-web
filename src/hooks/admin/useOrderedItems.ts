"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN } from "../../lib/adminQueries";

interface Ordered {
  id: number;
  display_order?: number | null;
}

interface OrderedItemsOptions<T extends Ordered> {
  load: () => Promise<T[]>;
  /** Saves one item's new place after a drag */
  saveOrder: (item: T & { display_order: number }) => Promise<unknown>;
  /** E.g. "FAQs", for the messages */
  what: string;
}

const sorted = <T extends Ordered>(items: T[]) => [...items].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.id - b.id);

// A list editor's items (FAQs, terms sections): loaded in their order, kept in step as each item
// is saved, added or removed on its own, and re-numbered when dragged. `refreshKey` goes up after
// every change, so the preview shows what was saved.
export function useOrderedItems<T extends Ordered>({ load, saveOrder, what }: OrderedItemsOptions<T>) {
  const queryClient = useQueryClient();
  // The items in order, cached: coming back to the editor shows them at once. Each change is
  // saved on its own, so the cached list changes with it.
  const queryKey = [ADMIN, "list", what];
  const query = useQuery({ queryKey, queryFn: async () => sorted(await load()) });
  const items = query.data ?? [];
  const loading = query.isPending;
  const loadError = query.data ? null : query.error;
  const error = loadError ? (loadError instanceof Error && loadError.message) || `Failed to load ${what}.` : "";
  const setItems = (update: T[] | ((prev: T[]) => T[])) =>
    queryClient.setQueryData<T[]>(queryKey, (prev) => (typeof update === "function" ? update(prev ?? []) : update));
  const reload = () => queryClient.invalidateQueries({ queryKey });
  const [refreshKey, setRefreshKey] = useState(0);
  const changed = () => setRefreshKey((n) => n + 1);

  useEffect(() => {
    if (loadError) console.error(`Failed to fetch ${what}:`, loadError);
  }, [loadError, what]);

  const reorder = async (reordered: T[]) => {
    const numbered = reordered.map((item, index) => ({ ...item, display_order: index + 1 }));
    setItems(numbered);
    try {
      await Promise.all(numbered.map(saveOrder));
      changed();
    } catch (err) {
      console.error(`Failed to reorder ${what}:`, err);
      reload();
    }
  };

  return {
    items,
    loading,
    error,
    refreshKey,
    changed,
    reorder,
    onUpdated: (updated: T) => {
      setItems((prev) => sorted(prev.map((item) => (item.id === updated.id ? updated : item))));
      changed();
    },
    onCreated: (created: T) => {
      setItems((prev) => sorted([...prev, created]));
      changed();
    },
    onDeleted: (id: number) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      changed();
    },
  };
}
