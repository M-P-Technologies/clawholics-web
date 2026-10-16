"use client";

import { createContext, useContext } from "react";
import type { useMyReviews } from "../useMyReviews";
import type { useProfile } from "../useProfile";

type Reviews = ReturnType<typeof useMyReviews>;

/** The signed-in client's profile, appointments and loyalty card, loaded once for the whole app */
export type MyAccount = ReturnType<typeof useProfile> & {
  reviews: Reviews["reviews"];
  submitReview: Reviews["submit"];
  /** Opens an appointment's sheet, from any screen */
  openAppointment: (id: number) => void;
};

export const MyAccountContext = createContext<MyAccount | null>(null);

export function useMyAccount(): MyAccount {
  const account = useContext(MyAccountContext);
  if (!account) throw new Error("useMyAccount must be used inside MyAccountProvider");
  return account;
}
