"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { readTermsPage, termsPageProblem } from "../../lib/homeSections";
import { fetchHomeContent, updateHomeContent } from "../../services/contentService";
import { fetchTacs, updateTac, type Tac } from "../../services/tacService";
import { useOrderedItems } from "./useOrderedItems";
import { usePageWords } from "./usePageWords";

// The Terms & Conditions editor: the sections in their order, and the page's heading (saved with Save)
export function useTermsEditor() {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const list = useOrderedItems<Tac>({
    load: fetchTacs,
    saveOrder: async (item) => updateTac(item.id, item.section, item.content, item.display_order, await getToken(), currentUser?.id),
    what: "Terms & Conditions",
  });
  const page = usePageWords({
    load: async () => readTermsPage(await fetchHomeContent()),
    save: async (words) => updateHomeContent(words, await getToken(), currentUser?.id),
    problem: termsPageProblem,
    what: "Terms page",
    onSaved: list.changed,
  });
  return {
    list,
    page,
    getToken,
    clerkId: currentUser?.id,
    /** The empty section for the Add form, placed after the others */
    newTac: { id: 0, section: "", content: "", display_order: list.items.length + 1 },
  };
}
