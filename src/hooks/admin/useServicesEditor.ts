"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN } from "../../lib/adminQueries";
import { useEditorSource } from "./useEditorSource";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/components/molecules";
import { readServicesPage, servicesPageProblem, type ServicesPageKey } from "../../lib/homeSections";
import { fetchCategories, type ServiceCategory } from "../../services/catalogService";
import { fetchHomeContent, updateHomeContent } from "../../services/contentService";
import { fetchServices, type NailService } from "../../services/serviceService";

type ServicesWords = Record<ServicesPageKey | "home_services_subtitle", string>;

// The Services editor: the services and categories (each saves on its own) and the page's own
// words (the line under its heading and the closing banner), which are saved together with Save.
const SERVICES_KEY = [ADMIN, "services"];
const CATEGORIES_KEY = [ADMIN, "categories"];
const NO_SERVICES: NailService[] = [];
const NO_CATEGORIES: ServiceCategory[] = [];

export function useServicesEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();
  // The services (shared with the artist cards) and categories, cached: coming back to the
  // editor shows them at once
  const servicesQuery = useQuery({ queryKey: SERVICES_KEY, queryFn: (): Promise<NailService[]> => fetchServices() });
  const categoriesQuery = useQuery({ queryKey: CATEGORIES_KEY, queryFn: (): Promise<ServiceCategory[]> => fetchCategories() });
  const services = servicesQuery.data ?? NO_SERVICES;
  const categories = categoriesQuery.data ?? NO_CATEGORIES;
  const isLoading = servicesQuery.isPending || categoriesQuery.isPending;
  // Bumped after every change, so the preview shows the saved services
  const [refreshKey, setRefreshKey] = useState(0);
  const changed = () => setRefreshKey((n) => n + 1);
  const [words, setWords] = useState<ServicesWords | null>(null);
  const [savedWords, setSavedWords] = useState<ServicesWords | null>(null);
  const [savingWords, setSavingWords] = useState(false);

  const saveWords = async () => {
    if (!words) return;
    const trimmed = Object.fromEntries(Object.entries(words).map(([key, value]) => [key, value.trim()])) as ServicesWords;
    if (!trimmed.home_services_subtitle) {
      toast.show("error", "The subtitle is empty", "Please write the line under the heading before saving. Nothing was saved.");
      return;
    }
    const problem = servicesPageProblem(trimmed);
    if (problem) {
      toast.show("error", "Please check the page's words", `${problem} Nothing was saved.`);
      return;
    }
    try {
      setSavingWords(true);
      await updateHomeContent(trimmed, await getToken(), currentUser?.id);
      setWords(trimmed);
      setSavedWords(trimmed);
      wordsSource.saved(trimmed);
      changed();
      toast.show("success", "Services page saved", "Your changes are now live on the Services page.");
    } catch (error) {
      console.error("Failed to save the services page words:", error);
      toast.show("error", "Changes not saved", "We couldn't save them, so the Services page is unchanged. Your edits are still on screen. Please try again.");
    } finally {
      setSavingWords(false);
    }
  };

  // Fetched again (and awaited) after a change
  const loadServices = () => queryClient.fetchQuery({ queryKey: SERVICES_KEY, queryFn: fetchServices, staleTime: 0 });
  const loadCategories = () => queryClient.fetchQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories, staleTime: 0 });

  const listError = (servicesQuery.data ? null : servicesQuery.error) ?? (categoriesQuery.data ? null : categoriesQuery.error);
  useEffect(() => {
    if (!listError) return;
    console.error("Failed to fetch services:", listError);
    toast.show("error", "Couldn't load the services", "We couldn't load the service list. Please refresh the page to try again.");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per failure
  }, [listError]);

  // The page's words are a bonus here: if they can't load, their fields stay hidden rather than
  // empty (which could be saved over the live ones)
  const wordsSource = useEditorSource({
    name: "servicesPage",
    load: async (): Promise<ServicesWords> => {
      const content = await fetchHomeContent();
      return { home_services_subtitle: content.home_services_subtitle ?? "", ...readServicesPage(content) };
    },
    dirty: !!words && JSON.stringify(words) !== JSON.stringify(savedWords),
    onLoad: (loaded) => {
      setWords(loaded);
      setSavedWords(loaded);
    },
  });

  // A service was saved or created: show it in the preview, and bring the list up to date
  const refreshAfter = (saved: "Saved" | "Created", message: string) => async () => {
    changed();
    try {
      await loadServices();
    } catch (error) {
      console.error("Failed to refresh services:", error);
      toast.show("info", `${saved}, but the list is out of date`, message);
    }
  };

  return {
    isLoading,
    services,
    categories,
    refreshKey,
    getToken,
    clerkId: currentUser?.id,
    words,
    setWord: (key: keyof ServicesWords) => (value: string) => setWords((prev) => (prev ? { ...prev, [key]: value } : prev)),
    wordsDirty: !!words && JSON.stringify(words) !== JSON.stringify(savedWords),
    savingWords,
    saveWords,
    discardWords: () => setWords(savedWords),
    categoriesChanged: async () => {
      await loadCategories();
      changed();
    },
    onServiceUpdated: refreshAfter("Saved", "Your changes were saved. We couldn't refresh the list, so please reload the page to see them."),
    onServiceCreated: refreshAfter("Created", "The service was created. We couldn't refresh the list, so please reload the page to see it."),
    onServiceDeleted: (serviceId: number) => {
      queryClient.setQueryData<NailService[]>(SERVICES_KEY, (prev) => prev?.filter((item) => item.id !== serviceId));
      changed();
    },
  };
}
