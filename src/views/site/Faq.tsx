"use client";

import { LoadingBar } from "@/components/atoms";
import LoadError from "../../components/ui/LoadError";
import StatePanel from "../../components/ui/StatePanel";
import { Blush } from "@/components/atoms";
import FaqList from "../../components/home/FaqList";
import CtaBand from "../../components/home/CtaBand";
import PageShell from "../../components/layout/PageShell";
import PageHeader from "../../components/layout/PageHeader";
import Section from "../../components/layout/Section";
import { useFaqs } from "../../hooks/useFaqs";
import { ctaLink } from "../../lib/homeSections";

// Every frequently asked question on one page. The home page's FAQ section shows the same list,
// so the admin edits both in one place (FAQs).
export default function Faq() {
  const { faqs, words, loading, error, reload } = useFaqs();

  if (loading) return <LoadingBar label="Loading frequently asked questions" />;
  if (error) return <LoadError what="frequently asked questions" onRetry={reload} />;

  return (
    <PageShell>
      <Section innerClassName="!max-w-4xl !gap-8">
        <Blush className="-right-32 top-1/4 h-80 w-80" />
        <PageHeader title={words.home_faq_page_title} subtitle={words.home_faq_page_intro} />

        {faqs.length === 0 ? (
          <StatePanel
            kind="empty"
            title="No questions here yet"
            message="We're putting our most common questions together. Until then, send us a message and we'll answer it."
          />
        ) : (
          <FaqList faqs={faqs} />
        )}
      </Section>

      {/* As edited in Admin > FAQs (or the defaults) */}
      <div id="faq-banner">
        <CtaBand
          title={words.home_faq_cta_title}
          text={words.home_faq_cta_text}
          primary={ctaLink(words.home_faq_cta_primary_link, words.home_faq_cta_primary_label)}
          secondary={ctaLink(words.home_faq_cta_secondary_link, words.home_faq_cta_secondary_label)}
        />
      </div>
    </PageShell>
  );
}
