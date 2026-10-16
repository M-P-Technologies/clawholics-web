import { QueryClient, queryOptions } from "@tanstack/react-query";
import { fetchHomeContent, fetchLegalContent, fetchTeamContent } from "../services/contentService";
import { fetchAboutContent, type AboutContent } from "../services/aboutService";
import { fetchCarousel, type CarouselItem } from "../services/carouselService";
import {
  fetchServiceById,
  fetchServiceGallery,
  fetchServices,
  type NailService,
  type ServiceGalleryImage,
} from "../services/serviceService";
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
import { fetchPaymentSettings } from "../services/paymentService";
import { fetchLoyaltySettings } from "../services/settingsService";
import type { HomeContent, TeamContent } from "../types";
import { PUBLIC, publicKeys } from "./publicKeys";

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

export { PUBLIC };

/** The home content keys (Admin > Homepage and Contact Us), e.g. home_title */
export type HomeContentMap = HomeContent & Record<string, string>;

export const publicQueries = {
  home: () => queryOptions({ queryKey: publicKeys.home, queryFn: (): Promise<HomeContentMap> => fetchHomeContent() }),
  team: () => queryOptions({ queryKey: publicKeys.team, queryFn: (): Promise<TeamContent> => fetchTeamContent() }),
  legal: () => queryOptions({ queryKey: publicKeys.legal, queryFn: fetchLegalContent }),
  about: () => queryOptions({ queryKey: publicKeys.about, queryFn: (): Promise<AboutContent> => fetchAboutContent() }),
  carousel: () => queryOptions({ queryKey: publicKeys.carousel, queryFn: (): Promise<CarouselItem[]> => fetchCarousel() }),
  services: () => queryOptions({ queryKey: publicKeys.services, queryFn: (): Promise<NailService[]> => fetchServices() }),
  service: (id: number) =>
    queryOptions({
      queryKey: publicKeys.service(id),
      queryFn: (): Promise<NailService> => fetchServiceById(id),
      // A service that isn't there won't be there on a second try either
      retry: (failures, error) => error.message !== SERVICE_NOT_FOUND && failures < 1,
    }),
  serviceGallery: (id: number) =>
    queryOptions({
      queryKey: publicKeys.serviceGallery(id),
      queryFn: async (): Promise<ServiceGalleryImage[]> => {
        const gallery: unknown = await fetchServiceGallery(id);
        return Array.isArray(gallery) ? gallery : [];
      },
    }),
  categories: () => queryOptions({ queryKey: publicKeys.categories, queryFn: (): Promise<ServiceCategory[]> => fetchCategories() }),
  faqs: () => queryOptions({ queryKey: publicKeys.faqs, queryFn: (): Promise<Faq[]> => fetchFaqs() }),
  tacs: () => queryOptions({ queryKey: publicKeys.tacs, queryFn: (): Promise<Tac[]> => fetchTacs() }),
  // The list endpoint can answer with an error object, so anything but a list counts as a failure
  nailists: () =>
    queryOptions({
      queryKey: publicKeys.nailists,
      queryFn: async (): Promise<Nailist[]> => {
        const list: unknown = await fetchNailists();
        if (!Array.isArray(list)) throw new Error("Unexpected artist list");
        return list;
      },
    }),
  /** null when there is no such artist */
  nailist: (id: number) =>
    queryOptions({ queryKey: publicKeys.nailist(id), queryFn: (): Promise<Nailist | null> => fetchNailistById(id) }),
  nailistGallery: (id: number) =>
    queryOptions({ queryKey: publicKeys.nailistGallery(id), queryFn: (): Promise<NailistGalleryImage[]> => fetchNailistGallery(id) }),
  reviews: () => queryOptions({ queryKey: [PUBLIC, "reviews"], queryFn: (): Promise<PublicReview[]> => fetchPublicReviews() }),
  /** The downpayment and the payment methods the salon has turned on */
  paymentSettings: () => queryOptions({ queryKey: [PUBLIC, "paymentSettings"], queryFn: fetchPaymentSettings }),
  /** The stamps a loyalty card needs for a reward */
  loyaltySettings: () => queryOptions({ queryKey: [PUBLIC, "loyaltySettings"], queryFn: fetchLoyaltySettings }),
};
