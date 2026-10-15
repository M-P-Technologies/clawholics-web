"use client";

import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import SiteLayout from "@/components/layout/SiteLayout";
import { Button } from "@/components/atoms";
import { EmptyState } from "@/components/molecules";

// Shown for any address that does not exist, instead of a blank screen.
function NotFound() {
  return (
    <PageShell>
      <Section innerClassName="min-h-[70vh] items-center justify-center">
        <EmptyState
          kind="empty"
          title="Page not found"
          message="We couldn't find the page you were looking for. The link may be old or mistyped. Nothing is wrong with your account or your booking."
        >
          <Button to="/">Back to home</Button>
          <Button to="/services" variant="secondary">
            View services
          </Button>
        </EmptyState>
      </Section>
    </PageShell>
  );
}

// Unknown URLs land here outside the (site) group, so the site chrome is added explicitly.
export default function NotFoundPage() {
  return (
    <SiteLayout>
      <NotFound />
    </SiteLayout>
  );
}
