"use client";

import PageShell from "@/components/layout/PageShell";
import BackButton from "@/components/layout/BackButton";
import Panel from "@/components/layout/Panel";
import Section from "@/components/layout/Section";
import { LoadingBar } from "@/components/atoms";
import { usePrivacyPolicy } from "@/hooks/usePrivacyPolicy";

// The privacy policy as edited in Admin > Privacy Policy; its loading is in hooks/usePrivacyPolicy
export default function Privacy() {
  const html = usePrivacyPolicy();

  if (html === null) return <LoadingBar label="Loading the privacy policy" />;

  return (
    <PageShell>
      <Section innerClassName="max-w-4xl gap-9!">
        <BackButton />
        <Panel as="article">
          <div className="legal-text" dangerouslySetInnerHTML={{ __html: html }} />
        </Panel>
      </Section>
    </PageShell>
  );
}
