import { useEffect, useState } from "react";
import { fetchFaqs } from "../services/faqService";
import { fetchHomeContent } from "../services/contentService";
import { FAQ_PAGE_DEFAULTS, readFaqPage } from "../lib/homeSections";
import { usePreviewVersion } from "@/lib/cmsPreview";
import type { Faq } from "../types";

// The FAQ page's questions: the same list the home page's FAQ section shows
export function useFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // The page's heading, intro and banner (Admin > FAQs); the defaults until they load
  const [words, setWords] = useState(FAQ_PAGE_DEFAULTS);
  // In the admin editor's preview, fetch again after each save
  const previewVersion = usePreviewVersion();

  useEffect(() => {
    fetchFaqs()
      .then((data) => {
        setFaqs(data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // The words are a bonus: if they can't load, the page keeps the defaults
    fetchHomeContent().then((content) => setWords(readFaqPage(content)), () => {});
  }, [attempt, previewVersion]);

  const reload = () => {
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return { faqs, words, loading, error, reload };
}
