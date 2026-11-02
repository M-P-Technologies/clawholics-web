import type { ReactNode } from "react";
import JsonLd from "@/components/seo/JsonLd";
import { faqSchema, metadataFor } from "@/server/seo";

export async function generateMetadata() {
  return metadataFor("faq");
}

// The FAQ page, with its questions and answers as schema markup
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={await faqSchema()} />
      {children}
    </>
  );
}
