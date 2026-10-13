"use client";

import { useEffect, useState } from "react";

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
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const changed = () => setRefreshKey((n) => n + 1);

  const reload = async () => {
    try {
      setLoading(true);
      setError("");
      setItems(sorted(await load()));
    } catch (err) {
      console.error(`Failed to fetch ${what}:`, err);
      setError((err instanceof Error && err.message) || `Failed to load ${what}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loads once
  }, []);

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
