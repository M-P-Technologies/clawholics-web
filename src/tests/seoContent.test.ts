import { describe, expect, it } from "vitest";
import { OG_IMAGE, PAGES, pageMetadata, pageSeo, siteOgImage } from "@/lib/seo";
import { seoFormFrom, seoProblem, shownTitle } from "@/lib/admin/seoEditor";

describe("search and sharing text", () => {
  it("shows the written defaults until something is saved", () => {
    expect(pageSeo("services", {})).toEqual({ title: PAGES.services.title, description: PAGES.services.description });
    expect(pageSeo("services", null).title).toBe(PAGES.services.title);
    expect(siteOgImage({})).toBe(OG_IMAGE);
  });

  it("uses what was saved, and the default for anything empty", () => {
    const content = { seo_services_title: "  Our prices  ", seo_services_description: "", seo_image: "https://images.test/share.webp" };
    expect(pageSeo("services", content)).toEqual({ title: "Our prices", description: PAGES.services.description });
    expect(siteOgImage(content).url).toBe("https://images.test/share.webp");
  });

  it("puts the saved text in a page's metadata, the home title without the studio name added", () => {
    const home = pageMetadata("home", { seo_home_title: "Clawholics: nails in CDO", seo_image: "https://images.test/share.webp" });
    expect(home.title).toEqual({ absolute: "Clawholics: nails in CDO" });
    expect(home.openGraph?.images).toEqual([{ url: "https://images.test/share.webp", alt: OG_IMAGE.alt }]);
    expect(pageMetadata("about", { seo_about_title: "Our story" }).title).toEqual({ absolute: "Our story | Clawholics by Max" });
  });

  it("leaves the account pages as written", () => {
    expect(pageSeo("login", { seo_login_title: "Hacked" }).title).toBe(PAGES.login.title);
  });

  it("starts the editor's form from the saved text or the defaults, and checks it", () => {
    const form = seoFormFrom({ seo_faq_title: "Questions" });
    expect(form.seo_faq_title).toBe("Questions");
    expect(form.seo_faq_description).toBe(PAGES.faq.description);
    expect(form.seo_image).toBe("");
    expect(seoProblem(form)).toBeNull();
    expect(seoProblem({ ...form, seo_faq_title: " " })).toMatch(/FAQs needs a title/);
    expect(seoProblem({ ...form, seo_about_description: "x".repeat(301) })).toMatch(/About Us description is over/);
    expect(shownTitle("about", "Our story")).toBe("Our story | Clawholics by Max");
    expect(shownTitle("home", "Hello")).toBe("Hello");
  });
});
