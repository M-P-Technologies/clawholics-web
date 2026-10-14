"use client";

import { Bell, CalendarCheck, Receipt } from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { useAdminNotifications } from "../../hooks/admin/useAdminNotifications";
import { notificationAge, notificationLine, notificationLink, notificationTitle } from "../../lib/admin/notifications";
import { Link } from "@/lib/router";

// The bell in the admin top bar: how many new bookings the signed-in admin hasn't seen, and the
// newest ones in a list (opening it marks them seen). Each opens where it's handled: a payment
// proof the list of proofs to review, a paid booking its client's page.
export default function NotificationBell() {
  const bell = useAdminNotifications();
  const box = useRef<HTMLDivElement>(null);
  const { open, close } = bell;

  // A click outside the list, or Escape, closes it
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) close();
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
    <div ref={box} className="relative shrink-0">
      <button
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

      {open && (
        <div
          role="region"
          aria-label="New bookings"
          className="absolute right-0 top-full z-50 mt-2 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-crimson-light/40 bg-milk shadow-petal"
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
        </div>
      )}
    </div>
  );
}
