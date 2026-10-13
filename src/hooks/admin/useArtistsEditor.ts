"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "../../components/ui/ToastProvider";
import { readTeamPage, type TeamPageKey } from "../../lib/homeSections";
import { fetchTeamContent, updateTeamContent } from "../../services/contentService";
import { fetchNailists, type Nailist } from "../../services/nailistService";

type TeamWords = Record<TeamPageKey, string>;

// The Artists editor: the artists (each saves on its own) and the Artists page's own words
// (team_* content), which are saved together with Save. The words stay hidden if they can't
// load, so they can't be saved empty.
export function useArtistsEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [nailists, setNailists] = useState<Nailist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Bumped after every change, so the preview shows the saved artists
  const [refreshKey, setRefreshKey] = useState(0);
  const changed = () => setRefreshKey((n) => n + 1);
  const [words, setWords] = useState<TeamWords | null>(null);
  const [savedWords, setSavedWords] = useState<TeamWords | null>(null);
  const [savingWords, setSavingWords] = useState(false);

  const saveWords = async () => {
    if (!words) return;
    const trimmed = Object.fromEntries(Object.entries(words).map(([key, value]) => [key, value.trim()])) as TeamWords;
    if (Object.values(trimmed).some((value) => !value)) {
      toast.show("error", "Some fields are empty", "Please fill in the heading, the intro and the strip title before saving. Nothing was saved.");
      return;
    }
    try {
      setSavingWords(true);
      await updateTeamContent(trimmed, await getToken(), currentUser?.id);
      setWords(trimmed);
      setSavedWords(trimmed);
      changed();
      toast.show("success", "Artists page saved", "Your changes are now live on the Artists page.");
    } catch (error) {
      console.error("Failed to save the artists page words:", error);
      toast.show("error", "Changes not saved", "We couldn't save them, so the Artists page is unchanged. Your edits are still on screen. Please try again.");
    } finally {
      setSavingWords(false);
    }
  };

  const loadNailists = async () => setNailists(await fetchNailists());

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          loadNailists(),
          fetchTeamContent().then(
            (content) => {
              const loaded = readTeamPage(content);
              setWords(loaded);
              setSavedWords(loaded);
            },
            () => {},
          ),
        ]);
      } catch (error) {
        console.error("Failed to fetch artists:", error);
        toast.show("error", "Couldn't load the artists", "We couldn't load the artist list. Please refresh the page to try again.");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loads once
  }, []);

  // An artist was saved or created: show it in the preview, and bring the list up to date
  const refreshAfter = (saved: "Saved" | "Created", message: string) => async () => {
    changed();
    try {
      await loadNailists();
    } catch (error) {
      console.error("Failed to refresh artists:", error);
      toast.show("info", `${saved}, but the list is out of date`, message);
    }
  };

  return {
    isLoading,
    nailists,
    refreshKey,
    changed,
    getToken,
    clerkId: currentUser?.id,
    words,
    setWord: (key: TeamPageKey) => (value: string) => setWords((prev) => (prev ? { ...prev, [key]: value } : prev)),
    wordsDirty: !!words && JSON.stringify(words) !== JSON.stringify(savedWords),
    savingWords,
    saveWords,
    discardWords: () => setWords(savedWords),
    onNailistUpdated: refreshAfter("Saved", "Your changes were saved. We couldn't refresh the list, so please reload the page to see them."),
    onNailistCreated: refreshAfter("Created", "The artist was created. We couldn't refresh the list, so please reload the page to see them."),
    onNailistDeleted: (nailistId: number) => {
      setNailists((prev) => prev.filter((item) => item.id !== nailistId));
      changed();
    },
  };
}
