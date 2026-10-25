"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged, adminKeys, adminQueries } from "../../lib/adminQueries";
import { markAdminNotificationsRead, type AdminNotification, type AdminNotifications } from "../../services/notificationService";
import { useNavigate } from "../../lib/router";
import { NOTIFICATIONS_POLL_MS, notificationLine, notificationLink, notificationTitle } from "../../lib/admin/notifications";
import { useAdminSession } from "./useAdminSession";
import { useBookingAlerts } from "./useBookingAlerts";

type Pages = InfiniteData<AdminNotifications, number | undefined>;

// How close to the bottom of the list (px) the next page is asked for
const LOAD_MORE_WITHIN = 48;

// The admin bell: the newest notifications of new bookings (paid online, or a payment proof sent),
// asked for every 30 seconds while an admin screen is open (also while the tab is in the
// background when a sound or desktop alert is on, so they reach an admin working elsewhere). A new one arriving while a screen
// is open shows a toast, plays a chime and, when the tab isn't in front, a desktop notification
// (each as the admin chose), and refreshes the screens' appointment data; opening the bell marks
// them all read for this admin. The list shows the newest 5 and loads 5 more each time the admin
// scrolls to its end; closing it goes back to the newest 5.
export function useAdminNotifications() {
  const { session, ready } = useAdminSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const alerts = useBookingAlerts();
  const query = useInfiniteQuery({
    ...adminQueries.notifications(session),
    enabled: ready,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    // In the background too, while a sound or desktop alert is on to tell the admin
    refetchIntervalInBackground: alerts.any,
  });
  const data = query.data;
  const firstPage = data?.pages[0];
  const [open, setOpen] = useState(false);
  // When the list was opened: the newest one then, and how many were unread. Those stay marked
  // new while it's open, older pages included as they load.
  const [openedAt, setOpenedAt] = useState<{ newest: number; unread: number } | null>(null);

  // Every page loaded, newest first (each page starts below the last id of the one before)
  const notifications = useMemo(() => (data?.pages ?? []).flatMap((page) => page.notifications), [data]);

  const newIds = useMemo(() => {
    if (!openedAt) return new Set<number>();
    return new Set(notifications.filter((n) => n.id <= openedAt.newest).slice(0, openedAt.unread).map((n) => n.id));
  }, [notifications, openedAt]);

  // The clients' photos (from Clerk), asked for once the list is open
  const profiles = useQuery({ ...adminQueries.directoryProfiles(session), enabled: ready && open }).data;
  const avatarOf = (n: AdminNotification) => (n.client_clerk_id && profiles?.[n.client_clerk_id]?.imageUrl) || "";

  // The newest notification this screen has seen: only ones newer than it are announced (not
  // the ones already there when the screen opened)
  const newestSeen = useRef<number | null>(null);
  // The unread count then, for a burst bigger than the page
  const unreadSeen = useRef(0);
  useEffect(() => {
    if (!firstPage) return;
    const newest = firstPage.notifications[0]?.id ?? 0;
    const previous = newestSeen.current;
    const previousUnread = unreadSeen.current;
    newestSeen.current = Math.max(previous ?? 0, newest);
    unreadSeen.current = firstPage.unread;
    if (previous === null) return;
    const arrived = firstPage.notifications.filter((n) => n.id > previous && n.unread);
    if (arrived.length === 0) return;
    // The whole page is new: more may have come than it holds, which the unread count tells
    const count = arrived.length === firstPage.notifications.length ? Math.max(arrived.length, firstPage.unread - previousUnread) : arrived.length;
    const one = count === 1 ? arrived[0] : null;
    const title = one ? notificationTitle(one) : `${count} new bookings`;
    const line = one ? notificationLine(one) : "Open the bell at the top to see them.";
    toast.show("info", title, line);
    // Several of one kind open that kind's list; a mix opens every booking
    const links = new Set(arrived.map(notificationLink));
    const link = links.size === 1 ? [...links][0] : "/clients";
    alerts.announce(title, line, `booking-${arrived[0].id}`, () => navigate(link));
    // The lists, the schedule and the dashboard show the new bookings
    void adminDataChanged(queryClient);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per new answer
  }, [firstPage]);

  // Back to the newest page, so the poll doesn't keep asking for every page loaded. A page still
  // on its way is stopped first, or it would put the pages back when it lands.
  const backToFirstPage = useCallback(async () => {
    const key = adminKeys.notifications();
    if ((queryClient.getQueryData<Pages>(key)?.pages.length ?? 0) <= 1 && !queryClient.isFetching({ queryKey: key })) return;
    await queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<Pages>(key, (current) =>
      current && current.pages.length > 1 ? { pages: current.pages.slice(0, 1), pageParams: current.pageParams.slice(0, 1) } : current,
    );
  }, [queryClient]);

  const close = useCallback(() => {
    setOpen(false);
    void backToFirstPage();
  }, [backToFirstPage]);

  // Also when the bell goes away without being closed (e.g. the browser's Back)
  useEffect(() => () => void backToFirstPage(), [backToFirstPage]);

  const markRead = async () => {
    const newest = firstPage?.notifications[0]?.id;
    if (!firstPage || !newest || firstPage.unread === 0) return;
    // Shown read at once (a poll already on its way would bring the old count back); if saving
    // fails, the next answer puts them back. An older page being loaded is left to finish.
    if (!query.isFetchingNextPage) await queryClient.cancelQueries({ queryKey: adminKeys.notifications() });
    queryClient.setQueryData<Pages>(adminKeys.notifications(), (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) => ({ ...page, unread: 0, notifications: page.notifications.map((n) => ({ ...n, unread: false })) })),
      },
    );
    try {
      await markAdminNotificationsRead(newest, await session.getToken(), session.clerkId);
    } catch (error) {
      console.error("Couldn't mark the notifications read:", error);
      void queryClient.invalidateQueries({ queryKey: adminKeys.notifications() });
    }
  };

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  return {
    notifications,
    unread: firstPage?.unread ?? 0,
    loading: query.isPending,
    failed: query.isError && !data,
    open,
    /** Unread when the list was opened */
    isNew: (id: number) => newIds.has(id),
    /** The client's photo, or "" for their initials */
    avatarOf,
    /** Older ones to load */
    hasMore: !!hasNextPage,
    loadingMore: isFetchingNextPage,
    loadMore,
    /** The list's scroll: near its end, the next page is loaded */
    onListScroll: (event: UIEvent<HTMLElement>) => {
      const list = event.currentTarget;
      if (list.scrollHeight - list.scrollTop - list.clientHeight <= LOAD_MORE_WITHIN) loadMore();
    },
    /** Opens or closes the list; opening it marks everything read */
    toggle: () => {
      if (open) return close();
      setOpenedAt({ newest: firstPage?.notifications[0]?.id ?? 0, unread: firstPage?.unread ?? 0 });
      void markRead();
      setOpen(true);
    },
    close,
    alerts,
  };
}
