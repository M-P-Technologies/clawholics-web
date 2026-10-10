import { type LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
  /** Page the card opens. */
  to: string;
  /** Optional router state, e.g. which profile tab to open. */
  state?: Record<string, unknown>;
}

export interface StripItem {
  id: number;
  image: string;
  name: string;
  price: number | null;
  duration: string;
  /** Where the photo is cropped from, as a percentage of its height (0 top, 100 bottom). */
  focusY: number;
}
