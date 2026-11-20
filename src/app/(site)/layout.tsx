import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import SiteLayout from "@/components/layout/SiteLayout";
import { prefetchPublicContent } from "@/server/publicPrefetch";

// The pages are built ahead with the shared content in them (server/publicPrefetch.ts). An
// admin's save rebuilds them through the catalog tag; this is only the backstop for changes made
// around the API, and for a page built while the database was slow or down (saved without its
// content, or a service/artist page saved as not found), which this bounds to an hour. Not
// minutes: every expiry re-renders each visited page (and crawlers visit them all), which was
// most of the server's ISR writes and CPU. It re-reads the cached data (publicCache's
// REVALIDATE_SECONDS, a day), not the database, unless that has been dropped. Must be a literal.
export const revalidate = 3600;

export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <HydrationBoundary state={await prefetchPublicContent()}>
      <SiteLayout>{children}</SiteLayout>
    </HydrationBoundary>
  );
}
