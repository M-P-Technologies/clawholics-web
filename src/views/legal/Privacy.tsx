"use client";

import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/layout/BackButton";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { PRIVACY_POLICY_HTML } from "../../data/privacyPolicyHtml";
import { useIsClient } from "../../hooks/useIsClient";

export default function Privacy() {
  const isClient = useIsClient();

  return (
    <PageShell>
      <Section innerClassName="max-w-4xl !gap-8">
        <BackButton />
        <Panel as="article">
          <div className="legal-text" dangerouslySetInnerHTML={{ __html: isClient ? sanitizeHtml(PRIVACY_POLICY_HTML, { allowStyle: true }) : "" }} />
        </Panel>
      </Section>
    </PageShell>
  );
}
