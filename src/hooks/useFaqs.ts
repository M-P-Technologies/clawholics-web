import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { FAQ_PAGE_DEFAULTS, ctaLink, readFaqPage } from "../lib/homeSections";

// The FAQ page's questions: the same list the home page's FAQ section shows
export function useFaqs() {
  const faqsQuery = useQuery(publicQueries.faqs());
  const faqs = faqsQuery.data ?? [];
  // A failed refresh keeps showing the copy already loaded
  const error = faqsQuery.isError && !faqsQuery.data;
  const loading = faqsQuery.isPending && !error;
  // The page's heading, intro and banner (Admin > FAQs); the defaults until they load, or if
  // they can't
  const content = useQuery(publicQueries.home()).data;
  const words = content ? readFaqPage(content) : FAQ_PAGE_DEFAULTS;

  const reload = () => {
    void faqsQuery.refetch();
  };

  // The closing banner's buttons
  const primary = ctaLink(words.home_faq_cta_primary_link, words.home_faq_cta_primary_label);
  const secondary = ctaLink(words.home_faq_cta_secondary_link, words.home_faq_cta_secondary_label);

  return { faqs, words, primary, secondary, loading, error, reload };
}
