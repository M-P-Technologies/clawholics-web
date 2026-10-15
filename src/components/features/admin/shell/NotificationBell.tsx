"use client";

import { Bell, CalendarCheck, Receipt } from "lucide-react";
import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdminNotifications } from "@/hooks/admin/useAdminNotifications";
import { notificationAge, notificationLine, notificationLink, notificationTitle } from "@/lib/admin/notifications";
import { Link } from "@/lib/router";

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
      // At least 16px from the screen's right edge, as the admin's gutter
      setPlace({ top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right) });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
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
          <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-light-orange">
            {bell.unread > 9 ? "9+" : bell.unread}
          </span>
        )}
      </button>

      {open && place && createPortal(
        <div
          ref={panel}
          role="region"
          aria-label="New bookings"
          style={{ top: place.top, right: place.right }}
          className="fixed z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-crimson-light/40 bg-milk shadow-xl shadow-crimson/20"
        >
          <p className="border-b border-crimson-light/40 px-4 py-3 font-display text-lg text-gray-red">New bookings</p>
          {bell.failed ? (
            <p className="px-4 py-6 text-[13px] text-gray-red/80">We couldn&apos;t load the notifications. They&apos;ll try again in a moment.</p>
          ) : bell.notifications.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-gray-red/80">
              {bell.loading ? "Loading…" : "Nothing yet. Paid bookings and payment proofs to review show here."}
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {bell.notifications.map((n) => {
                const Icon = n.kind === "proof_uploaded" ? Receipt : CalendarCheck;
                return (
                  <li key={n.id} className="border-b border-dotted border-crimson-light last:border-b-0">
                    <Link
                      to={notificationLink(n)}
                      onClick={close}
                      className={clsx("flex gap-3 px-4 py-3 text-left transition-colors hover:bg-crimson-light/15", bell.isNew(n.id) && "bg-crimson-light/20")}
                    >
                      <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-berry" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-bold text-gray-red">
                            {notificationTitle(n)}
                            {bell.isNew(n.id) && <span className="ml-2 rounded-full bg-crimson px-1.5 py-0.5 text-[10px] text-light-orange">New</span>}
                          </span>
                          <span className="shrink-0 text-[11px] text-gray-red/60">{notificationAge(n.created_at)}</span>
                        </span>
                        <span className="block text-[12px] text-gray-red/80">{notificationLine(n)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
