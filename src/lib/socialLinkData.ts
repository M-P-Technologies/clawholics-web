// The salon's social links as data, without the platform icons (lib/socialLinks.tsx re-exports
// these and adds the icons), so the server can read them too, e.g. for the schema markup.

export const MAX_SOCIAL_LINKS = 10;

export interface SocialLink {
  platform: string;
  /** What the link shows, e.g. the handle */
  name: string;
  url: string;
}

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

/** The salon's Instagram, where clients send their payment screenshots */
export const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/claw_holics/";

/** The Instagram link of the saved social links, or the salon's own until one is saved */
export function instagramUrl(content: object | null | undefined): string {
  return readSocialLinks(content).find((link) => link.platform === "instagram")?.url.trim() || DEFAULT_INSTAGRAM_URL;
}
