import { DEFAULT_HERO_IMAGE } from "../../data/home";
import type { HomeCMSContent } from "../../services/contentService";
import type { HomeSections, HomeTextKey } from "../homeSections";

// The Homepage editor's starting values and how its form is tidied before saving

export const EMPTY_HOME_CONTENT: HomeCMSContent = {
  home_title: "",
  home_services_subtitle: "",
  home_about_subtitle: "",
  home_about_image: "",
  home_hero_image: "",
};

/** The editor's own keys from the saved home content */
export const normalizeHomeContent = (data: Partial<HomeCMSContent>): HomeCMSContent => ({
  ...EMPTY_HOME_CONTENT,
  home_title: data.home_title || "",
  home_services_subtitle: data.home_services_subtitle || "",
  home_about_subtitle: data.home_about_subtitle || "",
  home_about_image: data.home_about_image || "",
  // Prefilled so a backend without the key can still be saved (every field is required)
  home_hero_image: data.home_hero_image || DEFAULT_HERO_IMAGE,
});

/** The sections with the spaces around every word trimmed */
export const trimHomeSections = (sections: HomeSections): HomeSections => ({
  ...sections,
  text: Object.fromEntries(Object.entries(sections.text).map(([key, value]) => [key, value.trim()])) as Record<HomeTextKey, string>,
  features: sections.features.map((f) => ({ ...f, title: f.title.trim(), text: f.text.trim() })),
  strip: sections.strip?.map((slide) => ({ ...slide, title: slide.title.trim() })) ?? null,
  offers: sections.offers.map((o) => ({ ...o, title: o.title.trim(), line: o.line.trim(), note: o.note.trim(), buttonLabel: o.buttonLabel.trim() })),
});
