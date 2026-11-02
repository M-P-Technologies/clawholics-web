import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import JsonLd from "@/components/seo/JsonLd";
import { findService, serviceMetadata, serviceSchemas } from "@/server/seo";
import { prefetchServicePage } from "@/server/publicPrefetch";

type Props = { params: Promise<{ id: string }> };

// A service's page: its own title, description and photo for search results and link previews,
// one canonical address (the name's slug, also for the old numeric /services/2 links), and its
// schema markup with the price range (all in server/seo)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return serviceMetadata(await findService((await params).id));
}

export default async function Layout({ children, params }: Props & { children: ReactNode }) {
  const service = await findService((await params).id);
  const state = service ? await prefetchServicePage(service.id) : undefined;
  return (
    <HydrationBoundary state={state}>
      {service && <JsonLd data={serviceSchemas(service)} />}
      {children}
    </HydrationBoundary>
  );
}
