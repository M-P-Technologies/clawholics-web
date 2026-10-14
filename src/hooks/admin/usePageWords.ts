"use client";

import { useEffect, useState } from "react";
import { useEditorSource } from "./useEditorSource";
import { useToast } from "../../components/ui/ToastProvider";

interface PageWordsOptions<K extends string> {
  /** Loads the saved words (with their defaults filled in) */
  load: () => Promise<Record<K, string>>;
  /** Saves them; only the keys given here are sent */
  save: (words: Record<K, string>) => Promise<unknown>;
  /** What stops them being saved, or null */
  problem: (words: Record<K, string>) => string | null;
  /** E.g. "FAQ page", for the messages */
  what: string;
  /** Called after a save, e.g. to refresh the preview */
  onSaved?: () => void;
}

// A page's own words (heading, intro, banner) in a list editor: loaded once, edited, then saved
// together with the panel's Save bar, apart from the list's items (which save one by one). Until
// they load, `words` is null and their fields stay hidden, so they can't be saved empty.
export function usePageWords<K extends string>({ load, save, problem, what, onSaved }: PageWordsOptions<K>) {
  const toast = useToast();
  const [words, setWords] = useState<Record<K, string> | null>(null);
  const [saved, setSaved] = useState<Record<K, string> | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = !!words && JSON.stringify(words) !== JSON.stringify(saved);
  // The saved words, cached: coming back to the editor shows them at once
  const source = useEditorSource({
    name: `${what} words`,
    load,
    dirty,
    onLoad: (loaded) => {
      setWords(loaded);
      setSaved(loaded);
    },
  });
  useEffect(() => {
    if (source.error) console.warn(`Couldn't load the ${what} words:`, source.error);
  }, [source.error, what]);

  const setWord = (key: K) => (value: string) => setWords((prev) => (prev ? { ...prev, [key]: value } : prev));

  const saveWords = async () => {
    if (!words) return;
    const trimmed = Object.fromEntries(Object.entries(words).map(([key, value]) => [key, String(value).trim()])) as Record<K, string>;
    const wrong = problem(trimmed);
    if (wrong) {
      toast.show("error", "Please check the page's words", `${wrong} Nothing was saved.`);
      return;
    }
    try {
      setSaving(true);
      await save(trimmed);
      setWords(trimmed);
      setSaved(trimmed);
      source.saved(trimmed);
      onSaved?.();
      toast.show("success", `${what[0].toUpperCase()}${what.slice(1)} saved`, `Your changes are now live on the ${what}.`);
    } catch (error) {
      console.error(`Failed to save the ${what} words:`, error);
      toast.show("error", "Changes not saved", `We couldn't save them, so the ${what} is unchanged. Your edits are still on screen. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return { words, setWord, dirty, saving, saveWords, discard: () => setWords(saved) };
}
