import type { ReactNode } from "react";
import { metadataFor } from "@/server/seo";
import { HydrationBoundary } from "@tanstack/react-query";
import { prefetchLegal } from "@/server/publicPrefetch";

export async function generateMetadata() {
  return metadataFor("tou");
}

// The legal text comes with the page, so it's in the first HTML
export default async function Layout({ children }: { children: ReactNode }) {
  return <HydrationBoundary state={await prefetchLegal()}>{children}</HydrationBoundary>;
}
