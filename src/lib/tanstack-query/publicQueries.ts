import { QueryClient, queryOptions } from "@tanstack/react-query";
import { fetchHomeContent, fetchLegalContent, fetchTeamContent } from "../../features/content/api/contentService";
import { fetchAboutContent, type AboutContent } from "../../features/content/api/aboutService";
import { fetchCarousel, type CarouselItem } from "../../features/content/api/carouselService";
import {
  fetchServiceById,
  fetchServiceGallery,
  fetchServices,
  type NailService,
  type ServiceGalleryImage,
} from "../../features/catalog/api/serviceService";
import { fetchCategories, type ServiceCategory } from "../../features/catalog/api/catalogService";
import { fetchFaqs, type Faq } from "../../features/content/api/faqService";
import { fetchTacs, type Tac } from "../../features/content/api/tacService";
import {
  fetchNailistById,
  fetchNailistGallery,
  fetchNailists,
  type Nailist,
  type NailistGalleryImage,
} from "../../features/catalog/api/nailistService";
import { fetchPublicReviews, type PublicReview } from "../../features/reviews/api/reviewService";
import { fetchPaymentSettings } from "../../features/payments/api/paymentService";
import { fetchLoyaltySettings } from "../../features/settings/api/settingsService";
import type { HomeContent, TeamContent } from "../../types";

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

/** The error fetchServiceById throws for a service the server doesn't have */
export const SERVICE_NOT_FOUND = "Service not found";

/** The first part of every public query's key, so they can be dropped together */
export const PUBLIC = "public";

/** The home content keys (Admin > Homepage and Contact Us), e.g. home_title */
export type HomeContentMap = HomeContent & Record<string, string>;

export const publicQueries = {
  home: () => queryOptions({ queryKey: [PUBLIC, "content", "home"], queryFn: (): Promise<HomeContentMap> => fetchHomeContent() }),
  team: () => queryOptions({ queryKey: [PUBLIC, "content", "team"], queryFn: (): Promise<TeamContent> => fetchTeamContent() }),
  legal: () => queryOptions({ queryKey: [PUBLIC, "content", "legal"], queryFn: fetchLegalContent }),
  about: () => queryOptions({ queryKey: [PUBLIC, "content", "about"], queryFn: (): Promise<AboutContent> => fetchAboutContent() }),
  carousel: () => queryOptions({ queryKey: [PUBLIC, "carousel"], queryFn: (): Promise<CarouselItem[]> => fetchCarousel() }),
  services: () => queryOptions({ queryKey: [PUBLIC, "services"], queryFn: (): Promise<NailService[]> => fetchServices() }),
  service: (id: number) =>
    queryOptions({
      queryKey: [PUBLIC, "services", id],
      queryFn: (): Promise<NailService> => fetchServiceById(id),
      // A service that isn't there won't be there on a second try either
      retry: (failures, error) => error.message !== SERVICE_NOT_FOUND && failures < 1,
    }),
  serviceGallery: (id: number) =>
    queryOptions({
      queryKey: [PUBLIC, "services", id, "gallery"],
      queryFn: async (): Promise<ServiceGalleryImage[]> => {
        const gallery: unknown = await fetchServiceGallery(id);
        return Array.isArray(gallery) ? gallery : [];
      },
    }),
  categories: () => queryOptions({ queryKey: [PUBLIC, "categories"], queryFn: (): Promise<ServiceCategory[]> => fetchCategories() }),
  faqs: () => queryOptions({ queryKey: [PUBLIC, "faqs"], queryFn: (): Promise<Faq[]> => fetchFaqs() }),
  tacs: () => queryOptions({ queryKey: [PUBLIC, "tacs"], queryFn: (): Promise<Tac[]> => fetchTacs() }),
  // The list endpoint can answer with an error object, so anything but a list counts as a failure
  nailists: () =>
    queryOptions({
      queryKey: [PUBLIC, "nailists"],
      queryFn: async (): Promise<Nailist[]> => {
        const list: unknown = await fetchNailists();
        if (!Array.isArray(list)) throw new Error("Unexpected artist list");
        return list;
      },
    }),
  /** null when there is no such artist */
  nailist: (id: number) =>
    queryOptions({ queryKey: [PUBLIC, "nailists", id], queryFn: (): Promise<Nailist | null> => fetchNailistById(id) }),
  nailistGallery: (id: number) =>
    queryOptions({ queryKey: [PUBLIC, "nailists", id, "gallery"], queryFn: (): Promise<NailistGalleryImage[]> => fetchNailistGallery(id) }),
  reviews: () => queryOptions({ queryKey: [PUBLIC, "reviews"], queryFn: (): Promise<PublicReview[]> => fetchPublicReviews() }),
  /** The downpayment and the payment methods the salon has turned on */
  paymentSettings: () => queryOptions({ queryKey: [PUBLIC, "paymentSettings"], queryFn: fetchPaymentSettings }),
  /** The stamps a loyalty card needs for a reward */
  loyaltySettings: () => queryOptions({ queryKey: [PUBLIC, "loyaltySettings"], queryFn: fetchLoyaltySettings }),
};
