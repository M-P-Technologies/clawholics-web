import { lastSeen } from "../utils/lastSeen";
import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useNavigate, useLocation, clearLocationState } from "@/lib/router";
import { fetchHomeContent } from "../services/contentService";
import { fetchServices } from "../services/serviceService";
import { fetchFaqs } from "../services/faqService";
import { fetchNailists } from "../services/nailistService";
import { fetchAboutContent, type AboutContent } from "../services/aboutService";
import { fetchProfile, isMissingProfile } from "../services/userService";
import type { HomeContent, Service, Faq, Nailist } from "../types";
import { startingPrice } from "../services/pricing";
import { type StripItem } from "../types/home";
import { photoFocusY } from "../data/home";

export function useHome() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [content, setContent] = useState<HomeContent | null>(() => lastSeen("home") ?? null);
  const [services, setServices] = useState<Service[]>(() => lastSeen("services") ?? []);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [nailists, setNailists] = useState<Nailist[]>(() => lastSeen("nailists") ?? []);
  const [about, setAbout] = useState<AboutContent | null>(() => lastSeen("about") ?? null);
  const [contentError, setContentError] = useState(false);
  const [contentAttempt, setContentAttempt] = useState(0);
  const [profileCheckFailed, setProfileCheckFailed] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);

  useEffect(() => {
    if (isLoaded && user) {
      const clerkRole = String(user.publicMetadata?.role || "").toLowerCase();

      if (clerkRole === "admin") {
        navigate("/AS_AdminDirectory", { replace: true });
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
            navigate("/AS_AdminDirectory", { replace: true });
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

  useEffect(() => {
    setContentError(false);
    // The headline content is required. The other sections just stay hidden if they fail to load.
    fetchHomeContent().then(setContent).catch(() => setContentError(true));
    fetchServices().then(setServices).catch(() => setServices([]));
    fetchFaqs().then(setFaqs).catch(() => setFaqs([]));
    fetchNailists().then(setNailists).catch(() => setNailists([]));
    fetchAboutContent().then(setAbout).catch(() => setAbout(null));
  }, [contentAttempt]);

  const reloadContent = () => setContentAttempt((n) => n + 1);

  // The strip shows each service with its own photo, price and hours.
  const stripItems: StripItem[] = services
    .filter((service) => service.image)
    .map((service) => ({
      id: service.id,
      image: service.image,
      name: service.name,
      price: startingPrice(service),
      duration: service.duration,
      focusY: photoFocusY(service.name),
    }));

  // Admins are sent to their own screens, so nothing is shown while that happens
  const isBusy = !isLoaded || (!!user && String(user.publicMetadata?.role || "").toLowerCase() === "admin");

  const retryProfile = () => setProfileRetry((n) => n + 1);

  return { retryProfile, isBusy, contentError, reloadContent, user, isLoaded, content, faqs, nailists, about, profileCheckFailed, setProfileRetry, stripItems };
}
