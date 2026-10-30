"use client";

import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { depositTerms, type DepositTerms } from "@/lib/depositTerms";

/** The booking deposit as set in Admin > Settings, or null until it loads (the site layout fills it on the server, so pages are drawn with it) */
export function useDepositTerms(): DepositTerms | null {
  const settings = useQuery(publicQueries.paymentSettings());
  return settings.data ? depositTerms(settings.data.downpayment_amount) : null;
}
