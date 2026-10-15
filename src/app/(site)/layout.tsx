import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import SiteLayout from "@/components/layout/SiteLayout";
import { prefetchPublicContent } from "@/server/publicPrefetch";

// The pages are built ahead with the shared content in them (server/publicPrefetch.ts). An
// admin's save rebuilds them through the catalog tag; this is only the backstop for changes made
// around the API, and for a build that couldn't reach the database.
export const revalidate = 600;

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <HydrationBoundary state={await prefetchPublicContent()}>
      <SiteLayout>{children}</SiteLayout>
    </HydrationBoundary>
  );
}
