"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { ACCOUNT } from "@/lib/accountQueries";
import { fetchEmailPreferences, fetchMyWaitlist, leaveWaitlist, saveEmailPreferences } from "@/services/waitlistService";

// The Profile's "Reminders" tab: the days the client is waiting for (and leaving one), and whether
// they get the rebooking emails again after unsubscribing
export function useNotificationSettings(clerkId: string | undefined) {
  const { getToken } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const waitlistKey = [ACCOUNT, clerkId, "waitlist"] as const;
  const prefsKey = [ACCOUNT, clerkId, "email-preferences"] as const;

  const waiting = useQuery({ queryKey: waitlistKey, queryFn: async () => fetchMyWaitlist(await getToken()), enabled: !!clerkId });
  const prefs = useQuery({ queryKey: prefsKey, queryFn: async () => fetchEmailPreferences(await getToken()), enabled: !!clerkId });

  const leave = useMutation({
    mutationFn: async (id: number) => leaveWaitlist(id, await getToken()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: waitlistKey }),
    onError: (error) => toast.show("error", "Couldn't leave the list", error.message),
  });
  const setRebook = useMutation({
    mutationFn: async (on: boolean) => saveEmailPreferences(on, await getToken()),
    onSuccess: (_data, on) => {
      queryClient.setQueryData(prefsKey, { rebook_emails: on });
      toast.show("success", on ? "Rebooking emails on" : "Rebooking emails off", "Booking emails are never affected.");
    },
    onError: (error) => toast.show("error", "Couldn't save that", error.message),
  });

  return {
    waiting: waiting.data ?? [],
    loadingWaiting: waiting.isLoading,
    waitingFailed: waiting.isError,
    leave: (id: number) => leave.mutate(id),
    leaving: leave.isPending,
    rebookEmails: prefs.data?.rebook_emails ?? null,
    setRebookEmails: (on: boolean) => setRebook.mutate(on),
    savingRebook: setRebook.isPending,
  };
}
