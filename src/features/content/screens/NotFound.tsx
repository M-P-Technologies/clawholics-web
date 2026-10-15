"use client";

import PageShell from "../../../components/layout/PageShell";
import Section from "../../../components/layout/Section";
import Button from "../../../components/ui/Button";
import StatePanel from "../../../components/ui/StatePanel";

// Shown for any address that does not exist, instead of a blank screen.
export default function NotFound() {
  return (
    <PageShell>
      <Section innerClassName="min-h-[70vh] items-center justify-center">
        <StatePanel
          kind="empty"
          title="Page not found"
          message="We couldn't find the page you were looking for. The link may be old or mistyped. Nothing is wrong with your account or your booking."
        >
          <Button to="/">Back to home</Button>
          <Button to="/services" variant="secondary">
            View services
          </Button>
        </StatePanel>
      </Section>
    </PageShell>
  );
}
