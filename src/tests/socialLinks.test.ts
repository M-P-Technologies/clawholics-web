import { describe, expect, it } from "vitest";
import { readSocialLinks, socialHref, socialLinksProblem, socialLinksToContent } from "@/lib/socialLinks";
import { withSalonLocation } from "@/lib/homeSections";

describe("social links", () => {
  it("shows the three links the site started with until a list is saved", () => {
    const content = {
      social_facebook_name: "fb", social_facebook_url: "https://facebook.com/x",
      social_instagram_name: "ig", social_instagram_url: "https://instagram.com/x",
      social_tiktok_name: "tt", social_tiktok_url: "",
    };
    expect(readSocialLinks(content)).toEqual([
      { platform: "facebook", name: "fb", url: "https://facebook.com/x" },
      { platform: "instagram", name: "ig", url: "https://instagram.com/x" },
    ]);
  });

  it("reads the saved list, in its order, and falls back when it's broken", () => {
    const links = [{ platform: "youtube", name: "yt", url: "https://youtube.com/@x" }, { platform: "email", name: "Email us", url: "hi@x.test" }];
    expect(readSocialLinks(socialLinksToContent(links))).toEqual(links);
    expect(readSocialLinks({ social_links: "[]" })).toEqual([]);
    expect(readSocialLinks({ social_links: "{oops", social_facebook_name: "fb", social_facebook_url: "https://facebook.com/x" })).toHaveLength(1);
  });

  it("opens an email link in the mail app", () => {
    expect(socialHref({ platform: "email", name: "", url: "hi@x.test" })).toBe("mailto:hi@x.test");
    expect(socialHref({ platform: "x", name: "", url: " https://x.com/a " })).toBe("https://x.com/a");
  });

  it("needs a name and a real address for each link", () => {
    expect(socialLinksProblem([{ platform: "instagram", name: "ig", url: "https://instagram.com/x" }])).toBeNull();
    expect(socialLinksProblem([{ platform: "instagram", name: " ", url: "https://instagram.com/x" }])).toMatch(/needs a name/);
    expect(socialLinksProblem([{ platform: "x", name: "a", url: "javascript:alert(1)" }])).toMatch(/full web address/);
    expect(socialLinksProblem([{ platform: "email", name: "a", url: "not-an-email" }])).toMatch(/valid email/);
  });
});

describe("salon location", () => {
  it("takes the address and map link from About Us, and the old contact ones only as a fallback", () => {
    const home = { contact_location: "Old address", contact_location_url: "https://maps.test/old", contact_phone: "0917" };
    expect(withSalonLocation(home, { about_location: "7th 3rd St", about_location_url: "https://maps.test/new" })).toEqual({
      contact_location: "7th 3rd St", contact_location_url: "https://maps.test/new", contact_phone: "0917",
    });
    expect(withSalonLocation(home, null)).toEqual(home);
  });
});
