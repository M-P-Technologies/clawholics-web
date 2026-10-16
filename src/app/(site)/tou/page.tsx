"use client";

import PageShell from "@/components/layout/PageShell";
import BackButton from "@/components/layout/BackButton";
import Panel from "@/components/layout/Panel";
import Section from "@/components/layout/Section";
import { useTermsOfUse } from "@/hooks/useTermsOfUse";

export default function Terms() {
  const html = useTermsOfUse();

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
