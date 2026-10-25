import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { useUser } from "@clerk/nextjs";
import { useLocation, clearLocationState } from "@/lib/router";
import { type StripItem } from "../types/home";
import { buildStripItems, readHomeSections } from "../lib/homeSections";

// The same empty list each render, so the scroll-to-FAQ effect doesn't run again for nothing
const NO_FAQS: never[] = [];

export function useHome() {
  const { user, isLoaded } = useUser();
  const location = useLocation();

  // The headline content is required. The other sections just stay hidden if they fail to load.
  const contentQuery = useQuery(publicQueries.home());
  const content = contentQuery.data ?? null;
  const services = useQuery(publicQueries.services()).data ?? [];
  const faqs = useQuery(publicQueries.faqs()).data ?? NO_FAQS;
  const nailists = useQuery(publicQueries.nailists()).data ?? [];
  const about = useQuery(publicQueries.about()).data ?? null;
  // A failed refresh keeps showing the copy already loaded
  const contentError = contentQuery.isError && !content;
  // Admins see the site like anyone else (the admin's View site opens it). Customers aren't sent
  // to /onboarding from here either: an incomplete profile only matters once they try to book,
  // and OnboardingGate / the booking screens ask for it then.

  useEffect(() => {
    if (location.state?.scrollTo === "faq" && faqs.length > 0) {
      const el = document.getElementById("faq");

      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 100);

        clearLocationState(location.pathname);
      }
    }
  }, [location.state, location.pathname, faqs]);

  const reloadContent = () => {
    void contentQuery.refetch();
  };

  // The strip shows the services chosen in Admin > Homepage, or each service that has a photo,
  // with its price and hours
  const stripItems: StripItem[] = buildStripItems(services, readHomeSections(content).strip);

  return { contentError, reloadContent, user, isLoaded, content, faqs, nailists, about, stripItems };
}
