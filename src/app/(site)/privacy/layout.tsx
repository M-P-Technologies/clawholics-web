import type { ReactNode } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { prefetchLegal } from "@/server/publicPrefetch";

export const metadata = pageMetadata("privacy");

// The legal text comes with the page, so it's in the first HTML
export default async function Layout({ children }: { children: ReactNode }) {
  return <HydrationBoundary state={await prefetchLegal()}>{children}</HydrationBoundary>;
}
