"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { faqPageProblem, readFaqPage } from "../../lib/homeSections";
import { fetchHomeContent, updateHomeContent } from "../../services/contentService";
import { fetchFaqs, updateFaq, type Faq } from "../../services/faqService";
import { useOrderedItems } from "./useOrderedItems";
import { usePageWords } from "./usePageWords";

// The FAQs editor: the questions in their order, and the FAQ page words (heading, intro and
// closing banner), which are saved with Save
export function useFaqsEditor() {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const list = useOrderedItems<Faq>({
    load: fetchFaqs,
    saveOrder: async (item) => updateFaq(item.id, item.question, item.answer, item.display_order, await getToken(), currentUser?.id),
    what: "FAQs",
  });
  const page = usePageWords({
    load: async () => readFaqPage(await fetchHomeContent()),
    save: async (words) => updateHomeContent(words, await getToken(), currentUser?.id),
    problem: faqPageProblem,
    what: "FAQ page",
    onSaved: list.changed,
  });
  return { list, page, getToken, clerkId: currentUser?.id };
}
