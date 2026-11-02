import { PAGES, SEO_IMAGE_KEY, SEO_PAGE_KEYS, SITE_NAME, SITE_URL, pageSeo, seoKey, type SeoContent, type SeoPageKey } from "../seo";

// Admin > Search & Sharing: what search engines and link previews show for each public page

/** What each page is called in the editor */
export const SEO_PAGE_LABELS: Record<SeoPageKey, string> = {
  home: "Home page",
  services: "Services",
  artists: "Artists",
  about: "About Us",
  contact: "Contact Us",
  faq: "FAQs",
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
  tou: "Terms of Use",
};

/** What search results show before they cut a title and a description off */
export const TITLE_ADVICE = 60;
export const DESCRIPTION_ADVICE = 155;
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 300;

/** The form: every page's title and description (saved or default), and the preview picture ("" for none) */
export function seoFormFrom(content: SeoContent | null | undefined): Record<string, string> {
  const form: Record<string, string> = { [SEO_IMAGE_KEY]: (content?.[SEO_IMAGE_KEY] ?? "").trim() };
  for (const page of SEO_PAGE_KEYS) {
    const { title, description } = pageSeo(page, content);
    form[seoKey(page, "title")] = title;
    form[seoKey(page, "description")] = description;
  }
  return form;
}

/** What's wrong with the form, or null when it can be saved */
export function seoProblem(form: Record<string, string>): string | null {
  for (const page of SEO_PAGE_KEYS) {
    const title = form[seoKey(page, "title")]?.trim() ?? "";
    const description = form[seoKey(page, "description")]?.trim() ?? "";
    const label = SEO_PAGE_LABELS[page];
    if (!title) return `${label} needs a title.`;
    if (!description) return `${label} needs a description.`;
    if (title.length > TITLE_MAX) return `The ${label} title is over ${TITLE_MAX} characters.`;
    if (description.length > DESCRIPTION_MAX) return `The ${label} description is over ${DESCRIPTION_MAX} characters.`;
  }
  return null;
}

/** The title as a search result shows it: every page but the home page ends with the studio's name */
export const shownTitle = (page: SeoPageKey, title: string) => (page === "home" ? title : `${title} | ${SITE_NAME}`);

/** The page's address as a search result shows it */
export const shownAddress = (page: SeoPageKey) => `${SITE_URL.replace(/^https?:\/\//, "")}${PAGES[page].path === "/" ? "" : PAGES[page].path}`;
