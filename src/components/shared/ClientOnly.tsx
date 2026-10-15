"use client";

import type { ReactNode } from "react";
import { useIsClient } from "../../hooks/useIsClient";
import { LoadingBar } from "../ui/LoadingBar";

// Mounts its children only in the browser, after hydration. For screens that read router
// state (sessionStorage) on their first render and redirect when it is missing, such as
// booking and payment: rendered on the server they would see no state and bounce on refresh.
export function ClientOnly({ children }: { children: ReactNode }) {
  const isClient = useIsClient();

  if (!isClient) return <LoadingBar label="Loading" />;

  return <>{children}</>;
}
