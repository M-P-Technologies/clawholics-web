import { inCmsPreview } from "@/lib/cmsPreview";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { useUser, useAuth } from "@clerk/nextjs";
import { useNavigate, useLocation, clearLocationState } from "@/lib/router";
import { fetchProfile, isMissingProfile } from "../services/userService";
import { type StripItem } from "../types/home";
import { buildStripItems, readHomeSections } from "../lib/homeSections";

// The same empty list each render, so the scroll-to-FAQ effect doesn't run again for nothing
const NO_FAQS: never[] = [];

export function useHome() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
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
  const [profileCheckFailed, setProfileCheckFailed] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);

  useEffect(() => {
    // The editor's preview shows the page as visitors see it, so an admin stays on it there
    if (isLoaded && user && !inCmsPreview()) {
      const clerkRole = String(user.publicMetadata?.role || "").toLowerCase();

      if (clerkRole === "admin") {
        navigate("/dashboard", { replace: true });
        return;
      }

      // Customers aren't sent to /onboarding from here: an incomplete profile only matters
      // once they try to book, and OnboardingGate / the booking screens ask for it then.
      // The profile is still fetched, for the admin fallback below.
      const checkProfile = async () => {
        try {
          const token = await getToken();
          const profile = await fetchProfile(user.id, token);

          // Fallback: Check backend role if Clerk metadata hasn't synced yet
          if (profile && String(profile.role || "").toLowerCase() === "admin") {
            navigate("/dashboard", { replace: true });
            return;
          }

          setProfileCheckFailed(false);
        } catch (err) {
          // A missing profile is expected for a new account, so it is neither logged nor an error
          if (isMissingProfile(err)) {
            setProfileCheckFailed(false);
          } else {
            console.error("Home Onboarding Check Error:", err);
            setProfileCheckFailed(true);
          }
        }
      };

      checkProfile();
    }
  }, [isLoaded, user, navigate, getToken, profileRetry]);

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

  // Admins are sent to their own screens, so nothing is shown while that happens
  const isBusy = !inCmsPreview() && (!isLoaded || (!!user && String(user.publicMetadata?.role || "").toLowerCase() === "admin"));

  const retryProfile = () => setProfileRetry((n) => n + 1);

  return { retryProfile, isBusy, contentError, reloadContent, user, isLoaded, content, faqs, nailists, about, profileCheckFailed, setProfileRetry, stripItems };
}
