"use client";

import { useQuery } from "@tanstack/react-query";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/layout/BackButton";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import { LoadingBar } from "../../components/ui/LoadingBar";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { PRIVACY_POLICY_HTML } from "../../data/privacyPolicyHtml";
import { publicQueries } from "@/lib/publicQueries";

// The privacy policy as edited in Admin > Privacy Policy; the original (generated) text until it's
// been saved there, or if it can't load
export default function Privacy() {
  const { data: content, isPending } = useQuery(publicQueries.legal());
  const saved = content?.legal_privacy_html;
  const html = isPending ? null : saved?.trim() ? saved : PRIVACY_POLICY_HTML;

  if (html === null) return <LoadingBar label="Loading the privacy policy" />;

  return (
    <PageShell>
      <Section innerClassName="max-w-4xl !gap-8">
        <BackButton />
        <Panel as="article">
          <div className="legal-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html, { allowStyle: true }) }} />
        </Panel>
      </Section>
    </PageShell>
  );
}
