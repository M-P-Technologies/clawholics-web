"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged, adminKeys, adminQueries } from "../../lib/adminQueries";
import { markAdminNotificationsRead, type AdminNotifications } from "../../services/notificationService";
import { useNavigate } from "../../lib/router";
import { NOTIFICATIONS_POLL_MS, notificationLine, notificationLink, notificationTitle } from "../../lib/admin/notifications";
import { useAdminSession } from "./useAdminSession";
import { useBookingAlerts } from "./useBookingAlerts";

// The admin bell: the newest notifications of new bookings (paid online, or a payment proof sent),
// asked for every 30 seconds while an admin screen is open (also while the tab is in the
// background when a sound or desktop alert is on, so they reach an admin working elsewhere). A new one arriving while a screen
// is open shows a toast, plays a chime and, when the tab isn't in front, a desktop notification
// (each as the admin chose), and refreshes the screens' appointment data; opening the bell marks
// them all read for this admin.
export function useAdminNotifications() {
  const { session, ready } = useAdminSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const alerts = useBookingAlerts();
  const query = useQuery({
    ...adminQueries.notifications(session),
    enabled: ready,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    // In the background too, while a sound or desktop alert is on to tell the admin
    refetchIntervalInBackground: alerts.any,
  });
  const data = query.data;
  const [open, setOpen] = useState(false);
  // The ones that were unread when the list was opened: they stay marked new while it's open
  const [newIds, setNewIds] = useState<ReadonlySet<number>>(() => new Set());

  // The newest notification this screen has seen: only ones newer than it are announced (not
  // the ones already there when the screen opened)
  const newestSeen = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    const newest = data.notifications[0]?.id ?? 0;
    const previous = newestSeen.current;
    newestSeen.current = Math.max(previous ?? 0, newest);
    if (previous === null) return;
    const arrived = data.notifications.filter((n) => n.id > previous && n.unread);
    if (arrived.length === 0) return;
    const one = arrived.length === 1 ? arrived[0] : null;
    const title = one ? notificationTitle(one) : `${arrived.length} new bookings`;
    const line = one ? notificationLine(one) : "Open the bell at the top to see them.";
    toast.show("info", title, line);
    // Several of one kind open that kind's list; a mix opens every booking
    const links = new Set(arrived.map(notificationLink));
    const link = links.size === 1 ? [...links][0] : "/clients";
    alerts.announce(title, line, `booking-${arrived[0].id}`, () => navigate(link));
    // The lists, the schedule and the dashboard show the new bookings
    void adminDataChanged(queryClient);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per new answer
  }, [data]);

  const close = useCallback(() => setOpen(false), []);

  const markRead = async () => {
    const newest = data?.notifications[0]?.id;
    if (!data || !newest || data.unread === 0) return;
    // Shown read at once (a poll already on its way would bring the old count back); if saving
    // fails, the next answer puts them back
    await queryClient.cancelQueries({ queryKey: adminKeys.notifications() });
    queryClient.setQueryData<AdminNotifications>(adminKeys.notifications(), (current) =>
      current && { unread: 0, notifications: current.notifications.map((n) => ({ ...n, unread: false })) },
    );
    try {
      await markAdminNotificationsRead(newest, await session.getToken(), session.clerkId);
    } catch (error) {
      console.error("Couldn't mark the notifications read:", error);
      void queryClient.invalidateQueries({ queryKey: adminKeys.notifications() });
    }
  };

  return {
    notifications: data?.notifications ?? [],
    unread: data?.unread ?? 0,
    loading: query.isPending,
    failed: query.isError && !data,
    open,
    /** Unread when the list was opened */
    isNew: (id: number) => newIds.has(id),
    /** Opens or closes the list; opening it marks everything read */
    toggle: () => {
      if (!open) {
        setNewIds(new Set((data?.notifications ?? []).filter((n) => n.unread).map((n) => n.id)));
        void markRead();
      }
      setOpen(!open);
    },
    close,
    alerts,
  };
}
