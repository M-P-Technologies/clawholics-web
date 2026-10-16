"use client";

import { useState } from "react";
import { DEFAULT_HERO_IMAGE } from "../data/home";
import { ctaLink, iconFor, readHomeSections } from "../lib/homeSections";
import { canOptimizeImage } from "../lib/imageHosts";
import { useHome } from "./useHome";
import { useTestimonials } from "./useTestimonials";

// The home page: its content (useHome), the approved reviews, the hero photo's state, and the
// words and pieces as edited in Admin > Homepage (or the defaults)
export function useHomePage() {
  const home = useHome();
  // The reviews an admin approved; the section is left out while there are none
  const testimonials = useTestimonials();
  // A broken or deleted hero photo leaves the soft background instead of a broken-image icon
  const [heroFailed, setHeroFailed] = useState(false);

  // The phone hero's "Explore": scroll to the first section below it
  const exploreMore = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("why-choose-us")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  const sections = home.content ? readHomeSections(home.content) : null;
  const t = sections?.text;

  return {
    ...home,
    testimonials,
    heroFailed,
    onHeroError: () => setHeroFailed(true),
    exploreMore,
    /** The page's words and pieces; null until the content has loaded */
    view:
      home.content && sections && t
        ? {
            t,
            heroImage: home.content.home_hero_image || DEFAULT_HERO_IMAGE,
            /** Whether next/image may resize the hero (an image from elsewhere is drawn as it is) */
            heroOptimized: canOptimizeImage(home.content.home_hero_image || DEFAULT_HERO_IMAGE),
            /** The "Why choose us" cards, each with its icon */
            features: sections.features.map((feature) => ({ ...feature, Icon: iconFor(feature.icon) })),
            offerImage: sections.offerImage,
            primary: ctaLink(t.home_cta_primary_link, t.home_cta_primary_label),
            secondary: ctaLink(t.home_cta_secondary_link, t.home_cta_secondary_label),
          }
        : null,
  };
}
