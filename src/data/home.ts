import { Heart, Mail, Sparkles, Users } from "lucide-react";
import { type Feature } from "../types/home";

export const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "Nails and lashes",
    text: "Manicures, gel and softgel sets, eyelash extensions and brow lamination.",
    to: "/services",
  },
  {
    icon: Users,
    title: "Pick your artist",
    text: "Choose a master or junior technician and book the one whose work you love.",
    to: "/team",
  },
  {
    icon: Heart,
    title: "Made with care",
    text: "Founded in 2023 on dedication, creativity and heart, in every set we do.",
    to: "/about",
  },
  {
    icon: Mail,
    title: "Easy to reach",
    text: "Message us, call, or find us on social media, and we will get back to you soon.",
    to: "/contact-us",
  },
];

// Hero line. Set here so it stays at two lines; the admin Homepage text is still
// used on the Services page.
export const HERO_TEXT =
  "From classic manicures to nail art, every service is designed to make you feel pampered and beautiful.";

// What the studio offers, from the nail, Russian manicure and eyelash pricelists.
// Kept to about five lines at the size it is shown.
export const OFFER_TEXT =
  "Nail art studio offering manicures and pedicures, from gel sets to softgel and hardgel extensions, plus BIAB overlays and Russian manicure. We also do lashes, brow lamination and tints.";

// The service photos are tall portraits shown in wide slots, so the middle of each one is
// what a plain crop shows. These set where each photo is cropped from (percent of its
// height) so the nails or toes are in view above the caption. Matched on the service name;
// anything else uses the middle, or lower down for pedicures where the toes sit lower.
export const PHOTO_FOCUS_Y: Record<string, number> = {
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

// From the studio's story on the About page.
export const ABOUT_TEXT =
  "Clawholics by Max was founded in 2023 with a simple dream. What began in a tiny corner of an eatery is now a nail studio built on dedication and heart.";

export const FACEBOOK_URL = "https://www.facebook.com/clawholicsbymax";

export const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Things the studio offers that are worth knowing before you come in.
export const GOOD_TO_KNOW = [
  "Book online with a ₱500 downpayment",
  "Custom nail art on every set",
  "Loyalty stamp card rewards",
  "Master and junior technicians",
];
