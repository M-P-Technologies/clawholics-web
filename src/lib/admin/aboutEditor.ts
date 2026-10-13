import { GOOD_TO_KNOW } from "../../data/home";
import type { AboutContent } from "../../services/aboutService";

// The About Us editor's constants and the shape its form starts from

export const ABOUT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const EMPTY_ABOUT_CONTENT: AboutContent = {
  about_description: "",
  about_image: "",
  about_location: "",
  about_location_url: "",
  about_business_hours_Monday: "",
  about_business_hours_Tuesday: "",
  about_business_hours_Wednesday: "",
  about_business_hours_Thursday: "",
  about_business_hours_Friday: "",
  about_business_hours_Saturday: "",
  about_business_hours_Sunday: "",
  about_good_to_know: "",
};

/** What the form starts from: the saved content, with the Good to know list the site shows when it was never saved */
export const aboutWithDefaults = (data: Partial<AboutContent>): AboutContent => ({
  ...EMPTY_ABOUT_CONTENT,
  ...data,
  about_good_to_know: data.about_good_to_know?.trim() ? data.about_good_to_know : GOOD_TO_KNOW.join("\n"),
});

/** The pages the preview can show */
export const ABOUT_PREVIEW_PAGES = [
  { label: "About", path: "/about" },
  { label: "Home", path: "/" },
];
