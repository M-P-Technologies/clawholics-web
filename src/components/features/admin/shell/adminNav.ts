import {
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  FileText,
  Gem,
  House,
  Info,
  LayoutDashboard,
  Lock,
  Mail,
  Palette,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { NavItem } from "@/components/organisms";

// The desktop sidebar's groups (each screen's icon shows when the sidebar is collapsed to a rail)
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/sales", label: "Sales", icon: Wallet },
      { path: "/performance", label: "Performance", icon: TrendingUp },
    ],
  },
  {
    title: "Front Desk",
    items: [
      { path: "/clients", label: "Clients & Bookings", icon: CalendarCheck },
      { path: "/schedule", label: "Schedule", icon: CalendarDays },
      { path: "/admin-scanner", label: "Admin Scanner", icon: QrCode },
      { path: "/admin-directory", label: "Admin Directory", icon: ShieldCheck },
    ],
  },
  {
    title: "Content Management",
    items: [
      { path: "/homepage", label: "Homepage", icon: House },
      { path: "/nail-services", label: "Services", icon: Gem },
      { path: "/nail-artists", label: "Artists", icon: Palette },
      { path: "/about-us", label: "About Us", icon: Info },
      { path: "/contact-info", label: "Contact Us", icon: Mail },
      { path: "/faqs", label: "FAQs", icon: CircleHelp },
      { path: "/terms-and-conditions", label: "Terms & Conditions", icon: FileText },
      { path: "/privacy-policy", label: "Privacy Policy", icon: Lock },
    ],
  },
];

// The phone's bottom tab bar: the screens used every day
export const TAB_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/clients", label: "Bookings", icon: CalendarCheck },
  { path: "/schedule", label: "Schedule", icon: CalendarDays },
  { path: "/admin-scanner", label: "Scanner", icon: QrCode },
];

// Everything else, in the tab bar's More sheet, under the sidebar's headings. The Admin Directory
// is the only Front Desk screen left over, so it sits with the Overview ones.
export const MORE_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { path: "/sales", label: "Sales", icon: Wallet },
      { path: "/performance", label: "Performance", icon: TrendingUp },
      { path: "/admin-directory", label: "Admin Directory", icon: ShieldCheck },
    ],
  },
  { title: "Content Management", items: NAV_GROUPS[2].items },
];

export const MORE_ITEMS: NavItem[] = MORE_GROUPS.flatMap((group) => group.items);
