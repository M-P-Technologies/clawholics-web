// The public pages each content editor can show in its preview

export const HOME_PREVIEW_PAGES = [{ label: "Home", path: "/" }];

export const FAQ_PREVIEW_PAGES = [
  { label: "FAQ page", path: "/faq" },
  { label: "Home (FAQ section)", path: "/#faq" },
];

export const TERMS_PREVIEW_PAGES = [{ label: "Terms & Conditions", path: "/terms" }];

export const ARTISTS_PREVIEW_PAGES = [
  { label: "Artists", path: "/artists" },
  { label: "Home (Artist spotlight)", path: "/#artist-spotlight" },
];

export const SERVICES_PREVIEW_PAGES = [{ label: "Services", path: "/services" }];

export const PRIVACY_PREVIEW_PAGES = [{ label: "Privacy policy", path: "/privacy" }];

/** The content key the privacy policy is saved under */
export const PRIVACY_KEY = "legal_privacy_html";
