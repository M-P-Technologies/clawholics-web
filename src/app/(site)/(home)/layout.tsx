import type { ReactNode } from "react";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { salonSchema } from "@/server/seo";

export const metadata = pageMetadata("home");

// The home page (in its own route group so it can have this layout; its address is still /),
// with the salon's schema markup: address, phone, opening hours and social profiles
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={await salonSchema()} />
      {children}
    </>
  );
}
