import { CalendarDays, Compass, House, UserRound } from "lucide-react";
import type { NavItem } from "@/components/organisms";

// Every address of the client app. Screens and hooks navigate with these, never with literals.
export const CLIENT_PATHS = {
  home: "/my",
  appointments: "/my/appointments",
  explore: "/my/explore",
  profile: "/my/profile",
  book: "/my/book",
  payment: "/my/payment",
  confirmation: "/my/confirmation",
  reschedule: "/my/reschedule",
} as const;

/** Whether a path is a screen of the client app. Links to anything else (the public site's pages)
 *  open in a new tab, so the app stays open where the client left it */
export const isClientPath = (path: string) => path === CLIENT_PATHS.home || path.startsWith(`${CLIENT_PATHS.home}/`) || path.startsWith(`${CLIENT_PATHS.home}?`);

/** Explore with a service open in its panel (or the phone's sheet) */
export const serviceDetailPath = (id: number) => `${CLIENT_PATHS.explore}?service=${id}`;

export type ClientTab = NavItem & { href: string };

// The phone's bottom tabs and the desktop sidebar, in the mockup's order
export const CLIENT_TABS: ClientTab[] = [
  { path: CLIENT_PATHS.home, href: CLIENT_PATHS.home, label: "Home", icon: House },
  { path: CLIENT_PATHS.appointments, href: CLIENT_PATHS.appointments, label: "Appointments", icon: CalendarDays },
  { path: CLIENT_PATHS.explore, href: CLIENT_PATHS.explore, label: "Explore", icon: Compass },
  { path: CLIENT_PATHS.profile, href: CLIENT_PATHS.profile, label: "Profile", icon: UserRound },
];

/** The phone's bottom tabs: the same, with the shorter "Bookings" so the four labels fit */
export const CLIENT_PHONE_TABS: ClientTab[] = CLIENT_TABS.map((tab) =>
  tab.path === CLIENT_PATHS.appointments ? { ...tab, label: "Bookings" } : tab,
);

/** Home is active only on /my itself; the others also on the screens under them */
export function isTabActive(tab: ClientTab, pathname: string): boolean {
  if (tab.href === CLIENT_PATHS.home) return pathname === CLIENT_PATHS.home;
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

const STEP_PATHS: string[] = [CLIENT_PATHS.book, CLIENT_PATHS.payment, CLIENT_PATHS.confirmation, CLIENT_PATHS.reschedule];

/** Screens with a back arrow instead of the tab bar: the booking steps */
export function isInnerScreen(pathname: string): boolean {
  return STEP_PATHS.includes(pathname);
}
