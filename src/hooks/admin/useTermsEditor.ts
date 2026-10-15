"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { fetchTacs, updateTac, type Tac } from "../../services/tacService";
import { useOrderedItems } from "./useOrderedItems";

// The Terms & Conditions editor: the sections in their order
export function useTermsEditor() {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const list = useOrderedItems<Tac>({
    load: fetchTacs,
    saveOrder: async (item) => updateTac(item.id, item.section, item.content, item.display_order, await getToken(), currentUser?.id),
    what: "Terms & Conditions",
  });
  return {
    list,
    getToken,
    clerkId: currentUser?.id,
    /** The empty section for the Add form, placed after the others */
    newTac: { id: 0, section: "", content: "", display_order: list.items.length + 1 },
  };
}
