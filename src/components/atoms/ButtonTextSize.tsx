"use client";

import { createContext, useContext, type ReactNode } from "react";

// How big a button's words are: the public site's grow from `md` (text-sm md:text-base); the admin
// and client apps, denser screens, keep them small until `2xl`. The (admin) and (client) layouts set "app".
export type ButtonTextSize = "site" | "app";

export const BUTTON_TEXT: Record<ButtonTextSize, string> = {
  site: "text-sm md:text-base",
  app: "text-sm 2xl:text-base",
};

const ButtonTextSizeContext = createContext<ButtonTextSize>("site");

export const useButtonTextSize = () => useContext(ButtonTextSizeContext);

export function ButtonTextSizeProvider({ size, children }: { size: ButtonTextSize; children: ReactNode }) {
  return <ButtonTextSizeContext.Provider value={size}>{children}</ButtonTextSizeContext.Provider>;
}
