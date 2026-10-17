"use client";

import { createContext, useContext, type ReactNode } from "react";

// How big a button's words are: the public site's are text-base at every width; the admin
// and client apps, denser screens, keep them text-sm at every width. The (admin) and (client) layouts set "app".
export type ButtonTextSize = "site" | "app";

export const BUTTON_TEXT: Record<ButtonTextSize, string> = {
  site: "text-base",
  app: "text-sm",
};

const ButtonTextSizeContext = createContext<ButtonTextSize>("site");

export const useButtonTextSize = () => useContext(ButtonTextSizeContext);

export function ButtonTextSizeProvider({ size, children }: { size: ButtonTextSize; children: ReactNode }) {
  return <ButtonTextSizeContext.Provider value={size}>{children}</ButtonTextSizeContext.Provider>;
}
