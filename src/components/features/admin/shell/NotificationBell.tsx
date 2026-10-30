"use client";

import { Bell, BellRing, CalendarCheck, CalendarDays, Receipt, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useAdminNotifications } from "@/hooks/admin/useAdminNotifications";
import { notificationAge, notificationLink, notificationParts, notificationTitle } from "@/lib/admin/notifications";
import { Link } from "@/lib/router";
import { Avatar } from "@/components/atoms";

/** Where the list sits: under the bell, its right edge in line with the bell's (on screen) */
interface Place {
  top: number;
  right: number;
}

// The bell in the admin top bar: how many new bookings the signed-in admin hasn't seen, and the
// newest ones in a list (opening it marks them seen). Each opens where it's handled: a payment
// proof the list of proofs to review, a paid booking its client's page.
// The list is drawn on the page's body, fixed under the bell: inside the top bar it would sit
// below the screen's cards (the bar's blur makes it a layer of its own) or be cut off by it.
export default function NotificationBell() {
  const bell = useAdminNotifications();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const { open, close } = bell;

  // Placed under the bell when opened, and again when the window is resized or scrolled
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = button.current?.getBoundingClientRect();
      if (!rect) return;
      // At least 16px from the screen's edges, as the admin's gutter: in line with the bell's right
      // edge where it fits, moved right where the list (28rem) would run off the left
      const width = Math.min(448, window.innerWidth - 32);
      const right = Math.min(Math.max(16, window.innerWidth - rect.right), window.innerWidth - width - 16);
      setPlace({ top: rect.bottom + 8, right });
    };
    // Scrolling the list itself doesn't move the bell
    const onScroll = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) measure();
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  // A click outside the bell and its list, or Escape, closes it
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!button.current?.contains(target) && !panel.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const label = bell.unread > 0 ? `Notifications, ${bell.unread} new` : "Notifications";

  return (
    <div className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={bell.toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-crimson-light text-berry transition-colors hover:bg-crimson-light/30 focus-visible:outline-2 focus-visible:outline-crimson"
      >
        <Bell size={17} aria-hidden="true" />
        {bell.unread > 0 && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-on-crimson">
            {bell.unread > 9 ? "9+" : bell.unread}
          </span>
        )}
      </button>

      {open && place && createPortal(
        <div
          ref={panel}
          role="region"
          aria-label="New bookings"
          // Phones: centred on the screen; from sm, under the bell (`--bell-right`)
          style={{ top: place.top, "--bell-right": `${place.right}px` } as CSSProperties}
          className="popover-in origin-top-right fixed z-60 flex max-sm:left-1/2 max-sm:-translate-x-1/2 sm:right-(--bell-right) w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-crimson-light/40 bg-milk shadow-xl shadow-crimson/20"
        >
          <p className="border-b border-crimson-light/40 px-3 py-3 font-display text-lg text-gray-red">New bookings</p>
          {bell.failed ? (
            <p className="px-3 py-6 text-[13px] text-gray-red">We couldn&apos;t load the notifications. They&apos;ll try again in a moment.</p>
          ) : bell.notifications.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-gray-red">
              {bell.loading ? "Loading…" : "Nothing yet. Paid bookings and payment proofs to review show here."}
            </p>
          ) : (
            // The five rows, with the Show older line just below them, so the list can still scroll;
            // near the end the next five load
            <ul className="max-h-[min(65vh,21rem)] overflow-y-auto" onScroll={bell.onListScroll}>
              {bell.notifications.map((n) => {
                const Icon = n.kind === "proof_uploaded" ? Receipt : CalendarCheck;
                const parts = notificationParts(n);
                return (
                  <li key={n.id} className="border-b border-dotted border-crimson-light last:border-b-0">
                    <Link
                      to={notificationLink(n)}
                      onClick={close}
                      className={clsx("flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-crimson-light/15", bell.isNew(n.id) && "bg-crimson-light/20")}
                    >
                      {/* The client, with what happened as a small badge on their photo */}
                      <span className="relative shrink-0">
                        <Avatar name={n.client_name || "A client"} imageUrl={bell.avatarOf(n)} size="md" decorative />
                        <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-milk text-berry ring-2 ring-milk">
                          <Icon size={13} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[13px] font-bold text-gray-red">
                            {notificationTitle(n)}
                            {bell.isNew(n.id) && <span className="ml-2 rounded-full bg-crimson px-1.5 py-0.5 text-[10px] text-on-crimson">New</span>}
                          </span>
                          <span className="shrink-0 text-xs text-gray-red">{notificationAge(n.created_at)}</span>
                        </span>
                        <span className="block text-xs text-gray-red">{parts.booking}</span>
                        {/* The visit's date and time on a line of its own */}
                        {parts.when && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-red">
                            <CalendarDays size={12} aria-hidden="true" className="shrink-0 text-berry" />
                            {parts.when}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {(bell.hasMore || bell.loadingMore) && (
                <li className="px-3 py-3 text-center">
                  {bell.loadingMore ? (
                    <span role="status" className="text-xs text-gray-red">Loading more…</span>
                  ) : (
                    // For a list too short to scroll, and for keyboards
                    <button type="button" onClick={bell.loadMore} className="text-xs font-bold text-crimson-ink underline underline-offset-4 hover:text-gray-red">
                      Show older
                    </button>
                  )}
                </li>
              )}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-crimson-light/40 px-3 py-3">
            <AlertToggle on={bell.alerts.sound} onClick={bell.alerts.toggleSound} icon={bell.alerts.sound ? Volume2 : VolumeX} label="Sound" />
            {!bell.alerts.desktopUnavailable && (
              <AlertToggle on={bell.alerts.desktop} onClick={() => void bell.alerts.toggleDesktop()} icon={BellRing} label="Desktop alerts" />
            )}
            {bell.alerts.desktopBlocked && (
              <p className="text-xs text-gray-red">Desktop alerts are blocked for this site in the browser&apos;s settings.</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** A sound or desktop alerts switch at the foot of the list */
function AlertToggle({ on, onClick, icon: Icon, label }: { on: boolean; onClick: () => void; icon: typeof Bell; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-crimson",
        on ? "border-crimson bg-crimson text-on-crimson" : "border-crimson-light text-gray-red hover:bg-crimson-light/30",
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {label}: {on ? "on" : "off"}
    </button>
  );
}
