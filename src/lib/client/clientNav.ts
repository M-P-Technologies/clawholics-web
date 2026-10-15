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

export const serviceDetailPath = (id: number) => `${CLIENT_PATHS.explore}/${id}`;

export type ClientTab = NavItem & { href: string };

// The phone's bottom tabs and the desktop sidebar, in the mockup's order
export const CLIENT_TABS: ClientTab[] = [
  { path: CLIENT_PATHS.home, href: CLIENT_PATHS.home, label: "Home", icon: House },
  { path: CLIENT_PATHS.appointments, href: CLIENT_PATHS.appointments, label: "Appointments", icon: CalendarDays },
  { path: CLIENT_PATHS.explore, href: CLIENT_PATHS.explore, label: "Explore", icon: Compass },
  { path: CLIENT_PATHS.profile, href: CLIENT_PATHS.profile, label: "Profile", icon: UserRound },
];

/** Home is active only on /my itself; the others also on the screens under them */
export function isTabActive(tab: ClientTab, pathname: string): boolean {
  if (tab.href === CLIENT_PATHS.home) return pathname === CLIENT_PATHS.home;
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

const STEP_PATHS: string[] = [CLIENT_PATHS.book, CLIENT_PATHS.payment, CLIENT_PATHS.confirmation, CLIENT_PATHS.reschedule];

/** Screens with a back arrow instead of the tab bar: a service's page and the booking steps */
export function isInnerScreen(pathname: string): boolean {
  return STEP_PATHS.includes(pathname) || /^\/my\/explore\/[^/]+$/.test(pathname);
}
