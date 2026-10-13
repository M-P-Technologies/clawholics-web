"use client";

import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/layout/BackButton";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import { LoadingBar } from "../../components/ui/LoadingBar";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { PRIVACY_POLICY_HTML } from "../../data/privacyPolicyHtml";
import { fetchLegalContent } from "../../services/contentService";
import { usePreviewVersion } from "@/lib/cmsPreview";

// The privacy policy as edited in Admin > Privacy Policy; the original (generated) text until it's
// been saved there, or if it can't load
export default function Privacy() {
  const [html, setHtml] = useState<string | null>(null);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();

  useEffect(() => {
    let live = true;
    fetchLegalContent().then(
      (content) => live && setHtml(content.legal_privacy_html?.trim() ? content.legal_privacy_html : PRIVACY_POLICY_HTML),
      () => live && setHtml(PRIVACY_POLICY_HTML),
    );
    return () => {
      live = false;
    };
  }, [previewVersion]);

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
