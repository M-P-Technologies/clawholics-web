import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURES,
  HOME_TEXT_DEFAULTS,
  buildStripItems,
  homeSectionsProblem,
  homeSectionsToContent,
  readGoodToKnow,
  readHomeSections,
  ctaLink,
  linkProblem,
  readServicesPage,
  SERVICES_PAGE_DEFAULTS,
} from "@/lib/homeSections";
import { GOOD_TO_KNOW } from "@/data/home";

const service = (id: number, over: object = {}) => ({
  id, name: `Service ${id}`, image: `https://img.test/${id}.jpg`, duration: "1 hr",
  pricing_type: "flat" as const, price: 500, master_price: 0, junior_price: 0, ...over,
});

describe("home sections", () => {
  it("shows what the site always did until something is saved", () => {
    const sections = readHomeSections({ home_title: "Hi" });
    expect(sections.text).toEqual(HOME_TEXT_DEFAULTS);
    expect(sections.features).toEqual(DEFAULT_FEATURES);
    expect(sections.offerImage).toBe("");
    expect(sections.strip).toBeNull();
  });

  it("reads saved values, and round-trips them through the content keys", () => {
    const saved = {
      home_features_title: "Why us",
      home_feature_2_icon: "gem",
      home_feature_2_title: "Luxury sets",
      home_cta_primary_link: "/faq",
      home_strip: JSON.stringify([{ serviceId: 3, title: "Hard gel", image: "" }]),
    };
    const sections = readHomeSections(saved);
    expect(sections.text.home_features_title).toBe("Why us");
    expect(sections.features[1]).toMatchObject({ icon: "gem", title: "Luxury sets", link: "/artists" });
    expect(sections.text.home_cta_primary_link).toBe("/faq");
    expect(sections.strip).toEqual([{ serviceId: 3, title: "Hard gel", image: "" }]);
    expect(readHomeSections(homeSectionsToContent(sections))).toEqual(sections);
  });

  it("treats a broken strip as not chosen, so the site keeps showing every service", () => {
    expect(readHomeSections({ home_strip: "{not json" }).strip).toBeNull();
    expect(readHomeSections({ home_strip: "[]" }).strip).toBeNull();
  });

  it("won't save empty words or a chat link that isn't a web address", () => {
    const sections = readHomeSections(null);
    expect(homeSectionsProblem(sections)).toBeNull();
    expect(homeSectionsProblem({ ...sections, text: { ...sections.text, home_cta_title: " " } })).toMatch(/needs something/);
    expect(homeSectionsProblem({ ...sections, features: sections.features.map((f, i) => (i === 2 ? { ...f, title: "" } : f)) })).toMatch(/card 3/);
    expect(homeSectionsProblem({ ...sections, text: { ...sections.text, home_footer_chat_url: "javascript:alert(1)" } })).toMatch(/chat link/);
  });
});

describe("service strip", () => {
  const services = [service(1), service(2, { image: "" }), service(3)];

  it("shows every service with a photo when no slides are chosen", () => {
    expect(buildStripItems(services, null).map((s) => s.id)).toEqual([1, 3]);
  });

  it("shows the chosen slides in order, with their own title and photo, once each", () => {
    const items = buildStripItems(services, [
      { serviceId: 3, title: "Hard gel", image: "" },
      { serviceId: 2, title: "", image: "https://img.test/own.jpg" },
      { serviceId: 3, title: "Again", image: "" },
      { serviceId: 99, title: "Gone", image: "" },
    ]);
    expect(items.map((s) => [s.id, s.name, s.image])).toEqual([
      [3, "Hard gel", "https://img.test/3.jpg"],
      [2, "Service 2", "https://img.test/own.jpg"],
    ]);
    expect(items[0].price).toBe(500);
  });
});

describe("good to know", () => {
  it("is the About content's lines, or the defaults", () => {
    expect(readGoodToKnow({ about_good_to_know: "Free parking\n\n  Walk-ins welcome " })).toEqual(["Free parking", "Walk-ins welcome"]);
    expect(readGoodToKnow({ about_good_to_know: "" })).toEqual(GOOD_TO_KNOW);
    expect(readGoodToKnow(null)).toEqual(GOOD_TO_KNOW);
  });
});

describe("banner links", () => {
  it("opens a page of the site, or a web address in a new tab", () => {
    expect(ctaLink("/faq", "FAQ")).toEqual({ to: "/faq", label: "FAQ" });
    expect(ctaLink(" https://m.me/salon ", "Chat")).toEqual({ href: "https://m.me/salon", label: "Chat" });
    expect(linkProblem("/contact", "Button")).toBeNull();
    expect(linkProblem("https://m.me/salon", "Button")).toBeNull();
    expect(linkProblem("javascript:alert(1)", "Button")).toMatch(/Button must open/);
    expect(linkProblem("/admin", "Button")).toMatch(/Button must open/);
  });

  it("reads the Services banner, or what the page always showed", () => {
    expect(readServicesPage(null)).toEqual(SERVICES_PAGE_DEFAULTS);
    expect(readServicesPage({ home_services_cta_title: "Still deciding?" }).home_services_cta_title).toBe("Still deciding?");
  });
});
