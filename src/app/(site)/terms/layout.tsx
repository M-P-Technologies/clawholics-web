import type { ReactNode } from "react";
import { metadataFor } from "@/server/seo";

export async function generateMetadata() {
  return metadataFor("terms");
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
