import SiteLayout from "@/components/layout/SiteLayout";
import NotFound from "@/features/content/screens/NotFound";

// Unknown URLs land here outside the (site) group, so the site chrome is added explicitly.
export default function NotFoundPage() {
  return (
    <SiteLayout>
      <NotFound />
    </SiteLayout>
  );
}
