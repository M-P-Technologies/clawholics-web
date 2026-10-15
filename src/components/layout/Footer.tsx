import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { Link } from "@/lib/router";
import logo from "../../assets/logo/logo-pink-transparent.png";
import { readHomeSections } from "../../lib/homeSections";
import { Button, Blush, FacebookIcon } from "@/components/atoms";
import { platformOf, readSocialLinks, socialHref } from "../../lib/socialLinks";

// Opens a chat with the studio on Facebook.

const linkClass = "w-fit text-sm text-on-crimson transition-colors hover:underline";
const columnTitle = "mb-3 font-display text-sm uppercase tracking-extrawide text-on-crimson";

export default function Footer() {
  // The footer works without the social links, so a failed request just leaves them out
  const data = useQuery(publicQueries.home()).data ?? null;

  // As edited in Admin > Contact Us
  const socials = data ? readSocialLinks(data).map((link) => ({ ...platformOf(link.platform), href: socialHref(link) })) : [];

  // The words, chat link and logo, as edited in Admin > Homepage (or the defaults)
  const sections = readHomeSections(data);
  const t = sections.text;

  return (
    <footer id="site-footer" className="relative overflow-hidden border-t border-crimson-light/80">
      <Blush className="-right-24 bottom-0 h-96 w-96" />

      <div className="mx-auto w-full max-w-6xl px-3 pt-15 md:px-9">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <nav aria-label="Explore" className="flex flex-col gap-2">
            <p className={columnTitle}>{t.home_footer_explore_title}</p>
            <Link to="/" className={linkClass}>Home</Link>
            <Link to="/services" className={linkClass}>Services</Link>
            <Link to="/artists" className={linkClass}>Artists</Link>
          </nav>

          <nav aria-label="Help" className="flex flex-col gap-2">
            <p className={columnTitle}>{t.home_footer_help_title}</p>
            <Link to="/about" className={linkClass}>About us</Link>
            <Link to="/faq" className={linkClass}>FAQ</Link>
            <Link to="/contact" className={linkClass}>Contact us</Link>
          </nav>

          <div className="flex flex-col gap-2">
            <p className={columnTitle}>{t.home_footer_follow_title}</p>
            <div className="flex items-center gap-3">
              {socials.map(({ label, href, Icon }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit Clawholics by Max ${label} page`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-crimson-light text-crimson-ink transition-colors hover:bg-crimson hover:text-on-crimson focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className={columnTitle}>{t.home_footer_chat_title}</p>
            <Button
              href={t.home_footer_chat_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit max-w-full gap-2 whitespace-normal text-left"
            >
              <FacebookIcon className="h-5 w-5 shrink-0" />
              <span>{t.home_footer_chat_label}</span>
            </Button>
          </div>
        </div>

        {/* The logo file has a lot of empty space around it (the artwork is 3218 x 860 of a
            3840 x 2160 image), so it is sized and offset to show just the artwork. */}
        {sections.footerLogo ? (
          // An uploaded logo has no built-in margin, so it's just fitted to the space
          <div className="relative mx-auto my-12 aspect-[3218/860] w-full max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded R2 image, sized by CSS like the built-in logo */}
            <img src={sections.footerLogo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full select-none object-contain" />
          </div>
        ) : (
          <div className="relative mx-auto my-12 aspect-[3218/860] w-full max-w-3xl overflow-hidden">
            {/* next/image serves it resized (the PNG itself is 400 KB) and only once it nears the screen */}
            <Image
              src={logo}
              alt=""
              aria-hidden="true"
              sizes="(min-width: 768px) 920px, 120vw"
              className="absolute max-w-none select-none"
              style={{ width: "119.33%", height: "auto", left: "-8.48%", top: "-70.12%" }}
            />
          </div>
        )}
      </div>

      <div className="relative border-t border-crimson-light/80 bg-light-orange/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 md:px-9">
          <p className="text-sm text-gray-red">{t.home_footer_copyright}</p>
          <div className="flex items-center gap-3">
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
