import { QueryClient, queryOptions } from "@tanstack/react-query";
import { fetchHomeContent, fetchLegalContent, fetchTeamContent } from "../services/contentService";
import { fetchAboutContent, type AboutContent } from "../services/aboutService";
import { fetchCarousel, type CarouselItem } from "../services/carouselService";
import { fetchServices, type NailService } from "../services/serviceService";
import { fetchCategories, type ServiceCategory } from "../services/catalogService";
import { fetchFaqs, type Faq } from "../services/faqService";
import { fetchTacs, type Tac } from "../services/tacService";
import {
  fetchNailistById,
  fetchNailistGallery,
  fetchNailists,
  type Nailist,
  type NailistGalleryImage,
} from "../services/nailistService";
import { fetchPublicReviews, type PublicReview } from "../services/reviewService";
import type { HomeContent, TeamContent } from "../types";

// The public site's content as TanStack Query queries. Pages that show the same content share
// one request and one cached copy, and coming back to a page shows the cached copy at once
// (refreshed in the background once it's older than STALE_MS).

/** How long a fetched copy counts as fresh: a page opened within this time doesn't ask again */
export const STALE_MS = 60_000;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // One quick retry: the pages have their own "try again" for anything that still fails
      queries: { staleTime: STALE_MS, retry: 1 },
    },
  });
}

/** The home content keys (Admin > Homepage and Contact Us), e.g. home_title */
export type HomeContentMap = HomeContent & Record<string, string>;

export const publicQueries = {
  home: () => queryOptions({ queryKey: ["content", "home"], queryFn: (): Promise<HomeContentMap> => fetchHomeContent() }),
  team: () => queryOptions({ queryKey: ["content", "team"], queryFn: (): Promise<TeamContent> => fetchTeamContent() }),
  legal: () => queryOptions({ queryKey: ["content", "legal"], queryFn: fetchLegalContent }),
  about: () => queryOptions({ queryKey: ["content", "about"], queryFn: (): Promise<AboutContent> => fetchAboutContent() }),
  carousel: () => queryOptions({ queryKey: ["carousel"], queryFn: (): Promise<CarouselItem[]> => fetchCarousel() }),
  services: () => queryOptions({ queryKey: ["services"], queryFn: (): Promise<NailService[]> => fetchServices() }),
  categories: () => queryOptions({ queryKey: ["categories"], queryFn: (): Promise<ServiceCategory[]> => fetchCategories() }),
  faqs: () => queryOptions({ queryKey: ["faqs"], queryFn: (): Promise<Faq[]> => fetchFaqs() }),
  tacs: () => queryOptions({ queryKey: ["tacs"], queryFn: (): Promise<Tac[]> => fetchTacs() }),
  // The list endpoint can answer with an error object, so anything but a list counts as a failure
  nailists: () =>
    queryOptions({
      queryKey: ["nailists"],
      queryFn: async (): Promise<Nailist[]> => {
        const list: unknown = await fetchNailists();
        if (!Array.isArray(list)) throw new Error("Unexpected artist list");
        return list;
      },
    }),
  /** null when there is no such artist */
  nailist: (id: number) =>
    queryOptions({ queryKey: ["nailists", id], queryFn: (): Promise<Nailist | null> => fetchNailistById(id) }),
  nailistGallery: (id: number) =>
    queryOptions({ queryKey: ["nailists", id, "gallery"], queryFn: (): Promise<NailistGalleryImage[]> => fetchNailistGallery(id) }),
  reviews: () => queryOptions({ queryKey: ["reviews", "public"], queryFn: (): Promise<PublicReview[]> => fetchPublicReviews() }),
};
