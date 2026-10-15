import { Globe, Mail } from "lucide-react";
import type { ComponentType } from "react";
import { FacebookIcon, InstagramIcon, LinkedInIcon, MessengerIcon, PinterestIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "@/components/atoms";

// The salon's social media links, shown in the footer of every page and on the Contact page.
// They're one list (social_links, JSON) so the admin can add, remove and reorder them; until it's
// saved, the three fixed links the site started with (social_facebook_*, social_instagram_*,
// social_tiktok_*) are shown.

type IconComponent = ComponentType<{ className?: string }>;

const LucideGlobe: IconComponent = ({ className }) => <Globe className={className} aria-hidden="true" />;
const LucideMail: IconComponent = ({ className }) => <Mail className={className} aria-hidden="true" />;

export const SOCIAL_PLATFORMS: { key: string; label: string; Icon: IconComponent }[] = [
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { key: "youtube", label: "YouTube", Icon: YouTubeIcon },
  { key: "x", label: "X (Twitter)", Icon: XIcon },
  { key: "threads", label: "Threads", Icon: ThreadsIcon },
  { key: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon },
  { key: "messenger", label: "Messenger", Icon: MessengerIcon },
  { key: "pinterest", label: "Pinterest", Icon: PinterestIcon },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon },
  { key: "email", label: "Email", Icon: LucideMail },
  { key: "website", label: "Website", Icon: LucideGlobe },
];

export const MAX_SOCIAL_LINKS = 10;

export interface SocialLink {
  platform: string;
  /** What the link shows, e.g. the handle */
  name: string;
  url: string;
}

export const platformOf = (key: string) => SOCIAL_PLATFORMS.find((p) => p.key === key) ?? SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];

const LEGACY = ["facebook", "instagram", "tiktok"];

/** The links as the site shows them: the saved list, or the three the site started with */
export function readSocialLinks(content: object | null | undefined): SocialLink[] {
  const values = (content ?? {}) as Record<string, unknown>;
  const raw = values.social_links;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((l): l is Record<string, unknown> => !!l && typeof l === "object" && typeof l.url === "string" && !!l.url)
          .map((l) => ({ platform: String(l.platform ?? "website"), name: String(l.name ?? ""), url: String(l.url) }))
          .slice(0, MAX_SOCIAL_LINKS);
      }
    } catch {
      // a broken list falls back to the fixed links below
    }
  }
  return LEGACY.flatMap((platform) => {
    const url = values[`social_${platform}_url`];
    if (typeof url !== "string" || !url.trim()) return [];
    const name = values[`social_${platform}_name`];
    return [{ platform, name: typeof name === "string" ? name : "", url }];
  });
}

export const socialLinksToContent = (links: SocialLink[]) => ({ social_links: JSON.stringify(links) });

/** Where a link goes: email addresses become mailto: links */
export const socialHref = (link: SocialLink) =>
  link.platform === "email" && !/^mailto:/i.test(link.url) ? `mailto:${link.url.trim()}` : link.url.trim();

/** What's wrong with the links, or null */
export function socialLinksProblem(links: SocialLink[]): string | null {
  for (const link of links) {
    const label = platformOf(link.platform).label;
    if (!link.name.trim()) return `The ${label} link needs a name to show, e.g. its username.`;
    if (link.platform === "email") {
      if (!/^(mailto:)?[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(link.url.trim())) return "The Email link needs a valid email address.";
    } else if (!/^https?:\/\/\S+$/i.test(link.url.trim())) {
      return `The ${label} link must be a full web address, starting with https://.`;
    }
  }
  return null;
}
