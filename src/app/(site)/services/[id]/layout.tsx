import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import JsonLd from "@/components/seo/JsonLd";
import { NOT_FOUND_METADATA, PAGES, seoMetadata, shortDescription } from "@/lib/seo";
import { breadcrumbSchema, serviceSchema } from "@/server/seo";
import { publicReads } from "@/server/publicCache";
import { prefetchServicePage } from "@/server/publicPrefetch";
import { findBySlugOrId, servicePath } from "@/utils/slug";
import type { NailService } from "@/services/serviceService";

type Props = { params: Promise<{ id: string }> };

// A service's page: its own title, description and photo for search results and link previews,
// one canonical address (the name's slug, also for the old numeric /services/2 links), and its
// schema markup with the price range
async function findService(param: string): Promise<NailService | null> {
  try {
    return findBySlugOrId((await publicReads.services()) as unknown as NailService[], decodeURIComponent(param));
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await findService((await params).id);
  if (!service) return NOT_FOUND_METADATA("Service");
  const prices = [service.junior_price, service.master_price].filter((p) => Number(p) > 0).map(Number);
  const from = prices.length ? ` From ₱${Math.min(...prices).toLocaleString("en-PH")}.` : "";
  return seoMetadata({
    path: servicePath(service),
    title: service.name,
    description: shortDescription(
      service.description && `${service.description}${from}`,
      `${service.name} at Clawholics by Max, a nail art studio in Cagayan de Oro.${from} Book online.`,
    ),
    image: service.image,
  });
}

export default async function Layout({ children, params }: Props & { children: ReactNode }) {
  const service = await findService((await params).id);
  // The service and their photos come with the page, so its heading and text are in the first HTML
  const state = service ? await prefetchServicePage(service.id) : undefined;
  return (
    <HydrationBoundary state={state}>
      {service && (
        <JsonLd
          data={[
            serviceSchema(service as unknown as Record<string, unknown>),
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Services", path: PAGES.services.path },
              { name: service.name, path: servicePath(service) },
            ]),
          ]}
        />
      )}
      {children}
    </HydrationBoundary>
  );
}
