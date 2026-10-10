"use client";

// The slice of the react-router API this app used, rebuilt on next/navigation, so the
// screens ported from the Vite SPA keep working unchanged.
//
// Next has no history state, so `navigate(to, { state })` and `<Link state>` keep the state
// in sessionStorage under the target path, and `useLocation().state` reads it back for the
// current path. Differences from react-router's per-history-entry state:
// - It survives a reload, but a fresh page load (typed URL, bookmark, Xendit redirect)
//   starts with no state, as react-router did.
// - Back/Forward to an earlier visit of the same path sees the newest state for that path.
// - During server rendering and hydration the state is null. Screens that need it on their
//   first render are mounted client-only (see components/guards/ClientOnly).
//
// Temporary: pages should move to query params or their own data fetches, then this goes.

import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import type { ComponentProps } from "react";

const STATE_PREFIX = "clawholics:nav-state:";
const STATE_EVENT = "clawholics:nav-state";

const pathOf = (to: string) => to.split(/[?#]/)[0] || "/";

// A fresh page load starts without router state; a reload or Back/Forward keeps it.
if (typeof window !== "undefined") {
  try {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (entry?.type === "navigate") {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith(STATE_PREFIX)) sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Storage blocked (private mode): there is no state to clear.
  }
}

function setLocationState(to: string, state: unknown) {
  const key = STATE_PREFIX + pathOf(to);
  try {
    if (state === undefined || state === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage blocked (private mode): the state just doesn't carry over.
  }
  window.dispatchEvent(new Event(STATE_EVENT));
}

/** Drops the state of the current page, like `history.replaceState({})` did. */
export function clearLocationState(pathname: string) {
  setLocationState(pathname, undefined);
}

function subscribe(onChange: () => void) {
  window.addEventListener(STATE_EVENT, onChange);
  return () => window.removeEventListener(STATE_EVENT, onChange);
}

function readRawState(pathname: string): string | null {
  try {
    return sessionStorage.getItem(STATE_PREFIX + pathname);
  } catch {
    return null;
  }
}

export interface Location {
  pathname: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
}

export function useLocation(): Location {
  const pathname = usePathname() || "/";
  const raw = useSyncExternalStore(
    subscribe,
    () => readRawState(pathname),
    () => null,
  );

  return useMemo(() => {
    let state: unknown = null;
    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch {
        state = null;
      }
    }
    return { pathname, state };
  }, [pathname, raw]);
}

interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export function useNavigate() {
  const router = useRouter();

  return useMemo(() => {
    function navigate(delta: number): void;
    function navigate(to: string, options?: NavigateOptions): void;
    function navigate(to: string | number, options: NavigateOptions = {}) {
      if (typeof to === "number") {
        if (to === -1) router.back();
        else window.history.go(to);
        return;
      }
      setLocationState(to, options.state);
      if (options.replace) router.replace(to);
      else router.push(to);
    }
    return navigate;
  }, [router]);
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  to: string;
  state?: unknown;
};

export function Link({ to, state, onClick, ...rest }: LinkProps) {
  return (
    <NextLink
      href={to}
      onClick={(e) => {
        onClick?.(e);
        // Only a plain left click navigates this tab; new-tab clicks leave its state alone.
        const newTab = e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
        if (!e.defaultPrevented && !newTab) setLocationState(to, state);
      }}
      {...rest}
    />
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useNextParams() as unknown as T;
}

/** react-router's tuple shape. Pages using this need a <Suspense> boundary (see their page.tsx). */
export function useSearchParams() {
  return [useNextSearchParams()] as const;
}
