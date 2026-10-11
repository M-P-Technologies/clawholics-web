import { useEffect,useState } from "react";
import { Link,useLocation,useNavigate } from "@/lib/router";
import logo from "../../assets/logo/logo-pink-transparent.png";
import { fetchHomeContent } from "../../services/contentService";
import Button from "../ui/Button";
import Blush from "../ui/Blush";
import { FacebookIcon,InstagramIcon,TikTokIcon } from "../ui/SocialIcons";

// Opens a chat with the studio on Facebook.
const FACEBOOK_CHAT_URL = "https://www.facebook.com/clawholicsbymax";

const linkClass = "w-fit text-sm text-gray-red transition-colors hover:text-crimson";
const columnTitle = "mb-4 font-display text-sm uppercase tracking-extrawide text-gray-red";

export default function Footer() {
  const [data, setData] = useState<Record<string, string> | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const handleFaqClick = () => {
    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: "faq" } });
    } else {
      document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // The footer works without the social links, so a failed request just leaves them out
    fetchHomeContent().then(setData).catch(() => {});
  }, []);

  const socials = data
    ? [
        { label: "Facebook", href: data.social_facebook_url, Icon: FacebookIcon },
        { label: "Instagram", href: data.social_instagram_url, Icon: InstagramIcon },
        { label: "TikTok", href: data.social_tiktok_url, Icon: TikTokIcon },
      ]
    : [];

  return (
    <footer className="relative overflow-hidden border-t border-crimson-light/80">
      <Blush className="-right-24 bottom-0 h-96 w-96" />

      <div className="mx-auto w-full max-w-6xl px-4 pt-16 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <nav aria-label="Explore" className="flex flex-col gap-2">
            <p className={columnTitle}>Explore</p>
            <Link to="/" className={linkClass}>Home</Link>
            <Link to="/services" className={linkClass}>Services</Link>
            <Link to="/artists" className={linkClass}>Artists</Link>
          </nav>

          <nav aria-label="Help" className="flex flex-col gap-2">
            <p className={columnTitle}>Help</p>
            <Link to="/about" className={linkClass}>About us</Link>
            <Button
              variant="bare"
              type="button"
              aria-label="Go to frequently asked questions section"
              onClick={handleFaqClick}
              className={`${linkClass} text-left`}
            >
              FAQ
            </Button>
            <Link to="/contact" className={linkClass}>Contact us</Link>
          </nav>

          <div className="flex flex-col gap-2">
            <p className={columnTitle}>Follow</p>
            <div className="flex items-center gap-4">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit Clawholics by Max ${label} page`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-crimson-light text-crimson transition-colors hover:bg-crimson hover:text-light-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className={columnTitle}>Chat with us</p>
            <Button
              href={FACEBOOK_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message Clawholics by Max on Facebook"
              className="w-fit max-w-full gap-2"
            >
              <FacebookIcon className="h-5 w-5 shrink-0" />
              <span className="sm:hidden">Chat on FB</span>
              <span className="max-sm:hidden">Chat on Facebook</span>
            </Button>
          </div>
        </div>

        {/* The logo file has a lot of empty space around it (the artwork is 3218 x 860 of a
            3840 x 2160 image), so it is sized and offset to show just the artwork. */}
        <div className="relative mx-auto my-12 aspect-[3218/860] w-full max-w-3xl overflow-hidden">
          <img
            src={logo.src}
            alt=""
            aria-hidden="true"
            className="absolute max-w-none select-none"
            style={{ width: "119.33%", left: "-8.48%", top: "-70.12%" }}
          />
        </div>
      </div>

      <div className="relative border-t border-crimson-light/80 bg-light-orange/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <p className="text-sm text-gray-red">Copyright © 2026 Clawholics by Max</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className={linkClass}>
              Privacy policy
            </Link>
            <Link to="/tou" className={linkClass}>
              Terms of use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
