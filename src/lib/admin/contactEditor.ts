import { CONTACT_PAGE_DEFAULTS, readContactPage } from "../homeSections";
import { socialLinksProblem, type SocialLink } from "../socialLinks";

// The Contact Us editor's fields and checks

export const CONTACT_BUSINESS_FIELDS = [
  { label: "Phone number", key: "contact_phone", type: "tel" },
  { label: "Email", key: "contact_email", type: "email" },
] as const;

/** The photo behind the contact details on the Contact page; empty shows the homepage's hero photo */
export const CONTACT_IMAGE_KEY = "contact_image";

const CONTACT_KEYS = ["contact_subtitle", CONTACT_IMAGE_KEY, ...CONTACT_BUSINESS_FIELDS.map((f) => f.key), ...Object.keys(CONTACT_PAGE_DEFAULTS)];

/** The pages the preview can show */
export const CONTACT_PREVIEW_PAGES = [
  { label: "Contact", path: "/contact" },
  { label: "Home (footer)", path: "/" },
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Just the editor's keys from the home content, "" for any never saved */
export const pickContactValues = (data: Record<string, string>) => {
  const headings = readContactPage(data);
  return Object.fromEntries(CONTACT_KEYS.map((key) => [key, key in headings ? headings[key as keyof typeof headings] : (data[key] ?? "")]));
};

/** What's wrong with the form, or null when it can be saved */
export function contactProblem(values: Record<string, string>, links: SocialLink[]): string | null {
  if (!values.contact_subtitle) return "The subheading can't be empty.";
  if (Object.keys(CONTACT_PAGE_DEFAULTS).some((key) => !values[key])) return "Every heading on the page needs something in it.";
  for (const field of CONTACT_BUSINESS_FIELDS) {
    const value = values[field.key];
    if (!value) return `${field.label} can't be empty.`;
    if (field.key === "contact_email" && !isValidEmail(value)) return "Please enter a valid email address.";
  }
  return socialLinksProblem(links);
}
