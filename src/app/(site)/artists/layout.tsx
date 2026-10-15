import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { prefetchArtistGalleries } from "@/server/publicPrefetch";

export const metadata = pageMetadata("artists");

// Every artist's gallery comes with the page (one query), for the "Their art" strip and the
// artist pages, instead of one request per artist from the browser
export default async function Layout({ children }: { children: ReactNode }) {
  return <HydrationBoundary state={await prefetchArtistGalleries()}>{children}</HydrationBoundary>;
}
