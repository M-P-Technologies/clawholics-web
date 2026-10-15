"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEditorSource } from "./useEditorSource";
import { useToast } from "@/components/molecules";
import { PUBLIC } from "../../lib/publicQueries";
import { fromForm, sameForm, settingsProblem, toForm, type SettingsForm } from "../../lib/admin/settings";
import { fetchSettings, updateSettings, type SalonSettings } from "../../services/settingsService";

const EMPTY_FORM: SettingsForm = { downpayment: "", methods: [], birthdayPct: "", stampsRequired: "" };

// Admin > Settings: the salon's settings, loaded, edited in one form and saved together
export function useSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [saved, setSaved] = useState<SettingsForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const dirty = !sameForm(form, saved);

  const source = useEditorSource({
    name: "settings",
    load: async () => fetchSettings(await getToken()),
    dirty,
    onLoad: (settings: SalonSettings) => {
      setForm(toForm(settings));
      setSaved(toForm(settings));
    },
  });

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleMethod = (method: string) =>
    setForm((f) => ({ ...f, methods: f.methods.includes(method) ? f.methods.filter((m) => m !== method) : [...f.methods, method] }));

  const save = async () => {
    const problem = settingsProblem(form);
    if (problem) {
      toast.show("error", "Settings not saved", problem);
      return;
    }
    try {
      setIsSaving(true);
      const settings = await updateSettings(fromForm(form), await getToken());
      setForm(toForm(settings));
      setSaved(toForm(settings));
      source.saved(settings);
      // The payment page, the loyalty cards and the scanner read these
      void queryClient.invalidateQueries({ queryKey: [PUBLIC, "paymentSettings"] });
      void queryClient.invalidateQueries({ queryKey: [PUBLIC, "loyaltySettings"] });
      toast.show("success", "Settings saved", "The site uses the new settings from now on.");
    } catch (error) {
      console.error("Failed to save the settings:", error);
      toast.show("error", "Settings not saved", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading: source.isLoading,
    loadFailed: source.failed,
    retry: source.retry,
    form,
    dirty,
    isSaving,
    setDownpayment: (value: string) => set("downpayment", value),
    setBirthdayPct: (value: string) => set("birthdayPct", value),
    setStampsRequired: (value: string) => set("stampsRequired", value),
    toggleMethod,
    save,
    discard: () => setForm(saved),
  };
}
