import { contactMethodLabel } from "@/data/profile";

// How an admin reaches a client: the links behind their phone, email and social handles, and
// their preferred way ("Text message", "Instagram"…) as one action. Phone and email open the
// phone's own apps; handles open the platform.

export interface ContactInfo {
  phone?: string | null;
  alt_phone?: string | null;
  preferred_contact_method?: string | null;
  instagram_handle?: string | null;
  facebook_handle?: string | null;
  tiktok_handle?: string | null;
}

const clean = (value?: string | null) => (value ?? "").trim();

/** "0917 123 4567" → "tel:09171234567" (a leading + is kept) */
export const telHref = (phone: string) => `tel:${clean(phone).replace(/[^\d+]/g, "")}`;
export const smsHref = (phone: string) => `sms:${clean(phone).replace(/[^\d+]/g, "")}`;
export const mailHref = (email: string) => `mailto:${clean(email)}`;

const isLink = (value: string) => /^https?:\/\//i.test(value);

export const instagramUrl = (handle: string) => `https://www.instagram.com/${clean(handle).replace(/^@+/, "")}/`;
export const tiktokUrl = (handle: string) => `https://www.tiktok.com/@${clean(handle).replace(/^@+/, "")}`;
/** A Facebook name or a profile link, as the client typed it: a link opens as it is, a name opens a Messenger chat */
export const facebookUrl = (handle: string) => (isLink(clean(handle)) ? clean(handle) : `https://m.me/${encodeURIComponent(clean(handle))}`);

/** Where a client page's "Client info" row leads, by its label; null for a row that isn't a link */
export function contactRowHref(label: string, value: string | null | undefined): string | null {
  const text = clean(value);
  if (!text) return null;
  switch (label) {
    case "Email":
      return mailHref(text);
    case "Phone":
    case "Other phone":
      return telHref(text);
    case "Instagram":
      return instagramUrl(text);
    case "Facebook":
      return facebookUrl(text);
    case "TikTok":
      return tiktokUrl(text);
    default:
      return null;
  }
}

export interface PreferredContact {
  /** "Text message" */
  label: string;
  /** What it uses: the number, or the username (or why there's nothing to use) */
  detail: string;
  /** The link to act on it, or null when the client has no number or username saved for it */
  href: string | null;
}

/** The client's preferred way to be reached, with the link to do it; null when they have no preference */
export function preferredContact(info: ContactInfo): PreferredContact | null {
  const method = clean(info.preferred_contact_method).toLowerCase();
  const label = contactMethodLabel(method);
  if (!label) return null;
  const phone = clean(info.phone);
  switch (method) {
    case "call":
      return { label, detail: phone || "No phone number saved", href: phone ? telHref(phone) : null };
    case "sms":
      return { label, detail: phone || "No phone number saved", href: phone ? smsHref(phone) : null };
    case "messenger": {
      const handle = clean(info.facebook_handle);
      return { label, detail: handle || "No Facebook name saved", href: handle ? facebookUrl(handle) : null };
    }
    case "instagram": {
      const handle = clean(info.instagram_handle);
      return { label, detail: handle ? `@${handle.replace(/^@+/, "")}` : "No Instagram username saved", href: handle ? instagramUrl(handle) : null };
    }
    case "tiktok": {
      const handle = clean(info.tiktok_handle);
      return { label, detail: handle ? `@${handle.replace(/^@+/, "")}` : "No TikTok username saved", href: handle ? tiktokUrl(handle) : null };
    }
    default:
      return null;
  }
}
