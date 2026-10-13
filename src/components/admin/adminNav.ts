export interface NavItem {
  path: string;
  label: string;
}

// The desktop sidebar's groups
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/sales", label: "Sales" },
      { path: "/performance", label: "Performance" },
    ],
  },
  {
    title: "Directories",
    items: [
      { path: "/admin-directory", label: "Admin Directory" },
      { path: "/client-directory", label: "Client Directory" },
    ],
  },
  {
    title: "Content Management",
    items: [
      { path: "/homepage", label: "Homepage" },
      { path: "/nail-services", label: "Services" },
      { path: "/nail-artists", label: "Artists" },
      { path: "/about-us", label: "About Us" },
      { path: "/contact-info", label: "Contact Us" },
      { path: "/faqs", label: "FAQs" },
      { path: "/terms-and-conditions", label: "Terms & Conditions" },
    ],
  },
  {
    title: "Client Appointments",
    items: [
      { path: "/schedule", label: "Schedule" },
      { path: "/appointments", label: "Appointments" },
    ],
  },
  {
    title: "Tools",
    items: [{ path: "/admin-scanner", label: "Admin Scanner" }],
  },
];

// The phone's bottom tab bar: the screens used every day
export const TAB_ITEMS: NavItem[] = [
  { path: "/appointments", label: "Appointments" },
  { path: "/schedule", label: "Schedule" },
  { path: "/admin-scanner", label: "Scanner" },
  { path: "/client-directory", label: "Clients" },
];

// Everything else, in the tab bar's More sheet
export const MORE_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/sales", label: "Sales" },
  { path: "/performance", label: "Performance" },
  { path: "/homepage", label: "Homepage" },
  { path: "/nail-services", label: "Services" },
  { path: "/nail-artists", label: "Artists" },
  { path: "/about-us", label: "About Us" },
  { path: "/contact-info", label: "Contact Us" },
  { path: "/faqs", label: "FAQs" },
  { path: "/terms-and-conditions", label: "Terms & Conditions" },
  { path: "/admin-directory", label: "Admin Directory" },
];
