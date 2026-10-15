"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountKeys, accountQueries } from "@/lib/tanstack-query/accountQueries";
import { claimBirthdayVoucher, isLiveVoucher, type BirthdayVoucher } from "../api/voucherService";

/**
 * The signed-in client's birthday voucher (null when they have none this year, or it has
 * expired or been used) and a way to claim it. Admins have none. A failed load reads as none.
 */
export function useBirthdayVoucher() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const clerkId = user?.id ?? "";
  const isClient = !!isSignedIn && !!user && user.publicMetadata?.role !== "admin";
  const query = useQuery({ ...accountQueries.birthdayVoucher(clerkId, getToken), enabled: isClient, retry: false });

  const claim = useMutation({
    mutationFn: async () => claimBirthdayVoucher({ token: await getToken(), clerkId }),
    onSuccess: (claimed) => queryClient.setQueryData<BirthdayVoucher | null>(accountKeys.birthdayVoucher(clerkId), claimed),
  });

  const voucher = isClient && isLiveVoucher(query.data) ? query.data : null;
  return { voucher, claim: claim.mutateAsync, isClaiming: claim.isPending, claimError: claim.error };
}
