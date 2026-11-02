import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import JsonLd from "@/components/seo/JsonLd";
import { artistMetadata, artistSchemas, findArtist } from "@/server/seo";
import { prefetchArtistPage } from "@/server/publicPrefetch";

type Props = { params: Promise<{ id: string }> };

// An artist's page: their own title, description and photo for search results and link previews,
// one canonical address (the name's slug, also for the old numeric /artists/2 links), and its
// schema markup (all in server/seo)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return artistMetadata(await findArtist((await params).id));
}

export default async function Layout({ children, params }: Props & { children: ReactNode }) {
  const artist = await findArtist((await params).id);
  const state = artist ? await prefetchArtistPage(artist.id) : undefined;
  return (
    <HydrationBoundary state={state}>
      {artist && <JsonLd data={artistSchemas(artist)} />}
      {children}
    </HydrationBoundary>
  );
}
