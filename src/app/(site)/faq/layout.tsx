import type { ReactNode } from "react";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { faqSchema } from "@/server/seo";

export const metadata = pageMetadata("faq");

// The FAQ page, with its questions and answers as schema markup
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={await faqSchema()} />
      {children}
    </>
  );
}
