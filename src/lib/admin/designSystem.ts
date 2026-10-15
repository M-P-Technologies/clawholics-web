import { CalendarDays, House } from "lucide-react";

// The design system page's sample data

/** A two-item menu for the SideBar and TabBar samples */
export const DEMO_NAV = [{ title: "Group", items: [{ path: "/design-system", label: "Home", icon: House }, { path: "/demo-b", label: "Schedule", icon: CalendarDays }] }];

export const BADGE_TONES = ["success", "warning", "danger", "info", "neutral", "brand"] as const;

export const AVATAR_SIZES = ["sm", "md", "lg", "xl"] as const;
