// The hero photo used until an admin sets one (Homepage > Home Hero Image). It lives in R2, not in
// the bundle, so the live site still has a photo while content comes from a backend that doesn't
// have the home_hero_image key yet.
export const DEFAULT_HERO_IMAGE = "https://images.clawholicsbymax.com/content/hero-softgel-extensions.webp";

// The service photos are tall portraits shown in wide slots, so the middle of each one is
// what a plain crop shows. These set where each photo is cropped from (percent of its
// height) so the nails or toes are in view above the caption. Matched on the service name;
// anything else uses the middle, or lower down for pedicures where the toes sit lower.
const PHOTO_FOCUS_Y: Record<string, number> = {
  "softgel extensions": 55,
  "hard gel": 43,
  "biab overlay": 52,
  "gel overlay": 35,
  "gel manicure": 43,
  "gel pedicure": 73,
  "pedi softgel extension": 78,
};

export const photoFocusY = (name: string) =>
  PHOTO_FOCUS_Y[name.trim().toLowerCase()] ?? (/pedi/i.test(name) ? 75 : 50);

export const FACEBOOK_URL = "https://www.facebook.com/clawholicsbymax";

export const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Things the studio offers that are worth knowing before you come in. The default for the
// About content's Good to know list (about_good_to_know), shown in the home page's Quick contact.
export const GOOD_TO_KNOW = [
  "Book online with a small downpayment",
  "Custom nail art on every set",
  "Loyalty stamp card rewards",
  "Master and junior technicians",
];
