"use client";

import { useSyncExternalStore } from "react";

// The cookie notice: shown until the visitor closes it, then remembered in this browser.
// The site sets only the cookies it needs (Clerk's sign-in and security cookies); there's no
// tracking or advertising, so there's nothing to opt out of and the notice just says so.

const KEY = "clawholics-cookie-notice";

const listeners = new Set<() => void>();
// Closed in this visit, for a browser whose storage is blocked (private mode)
let closedThisVisit = false;

function seen(): boolean {
  if (closedThisVisit) return true;
  try {
    return window.localStorage.getItem(KEY) === "seen";
  } catch {
    return false;
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useCookieNotice() {
  // Counted as seen on the server and while hydrating, so the first HTML never has the notice
  // and nothing shifts; the browser then shows it if it hasn't been closed before
  const isSeen = useSyncExternalStore(subscribe, seen, () => true);

  const close = () => {
    closedThisVisit = true;
    try {
      window.localStorage.setItem(KEY, "seen");
    } catch {
      // Not remembered; it shows again next visit
    }
    listeners.forEach((listener) => listener());
  };

  return { open: !isSeen, close };
}

/** For tests: forget that the notice was closed in this visit */
export function resetCookieNotice() {
  closedThisVisit = false;
}
