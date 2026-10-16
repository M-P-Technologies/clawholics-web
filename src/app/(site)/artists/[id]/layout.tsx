import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import JsonLd from "@/components/seo/JsonLd";
import { NOT_FOUND_METADATA, PAGES, seoMetadata, shortDescription } from "@/lib/seo";
import { artistSchema, breadcrumbSchema } from "@/server/seo";
import { publicReads } from "@/server/publicCache";
import { readOrNull } from "@/server/timeLimit";
import { prefetchArtistPage } from "@/server/publicPrefetch";
import { artistPath, findBySlugOrId } from "@/utils/slug";
import type { Nailist } from "@/services/nailistService";

type Props = { params: Promise<{ id: string }> };

// An artist's page: their own title, description and photo for search results and link previews,
// one canonical address (the name's slug), and their schema markup
async function findArtist(param: string): Promise<Nailist | null> {
  // A slow or failed read leaves the page without its metadata, never stuck
  const list = await readOrNull(() => publicReads.nailists() as unknown as Promise<Nailist[]>, "Artist lookup");
  return list ? findBySlugOrId(list, decodeURIComponent(param)) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await findArtist((await params).id);
  if (!artist) return NOT_FOUND_METADATA("Artist");
  const role = artist.position || "Nail technician";
  return seoMetadata({
    path: artistPath(artist),
    title: `${artist.name}, ${role}`,
    description: shortDescription(artist.bio, `${artist.name} is a ${role.toLowerCase()} at Clawholics by Max in Cagayan de Oro. See their work and book with them.`),
    image: artist.image,
  });
}

export default async function Layout({ children, params }: Props & { children: ReactNode }) {
  const artist = await findArtist((await params).id);
  // The artist and their photos come with the page, so its heading and text are in the first HTML
  const state = artist ? await prefetchArtistPage(artist.id) : undefined;
  return (
    <HydrationBoundary state={state}>
      {artist && (
        <JsonLd
          data={[
            artistSchema(artist as unknown as Record<string, unknown>),
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Artists", path: PAGES.artists.path },
              { name: artist.name, path: artistPath(artist) },
            ]),
          ]}
        />
      )}
      {children}
    </HydrationBoundary>
  );
}
