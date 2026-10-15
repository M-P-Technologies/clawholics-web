"use client";

import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "../../../lib/tanstack-query/publicQueries";
import { DEFAULT_STAMP_TARGET } from "../../profile/lib/profileView";

/** The stamps a loyalty card needs for a reward (Admin > Settings); the default until it loads */
export function useStampTarget(): number {
  return useQuery(publicQueries.loyaltySettings()).data?.stamps_required ?? DEFAULT_STAMP_TARGET;
}
