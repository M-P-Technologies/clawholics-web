import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { readHomeSections } from "../lib/homeSections";

// The site's menu names and top bar logo, as edited in Admin > Homepage (or the defaults, until
// they load or if they can't)
export function useSiteNav() {
  const sections = readHomeSections(useQuery(publicQueries.home()).data ?? null);
  const t = sections.text;
  return {
    navLogo: sections.navLogo,
    links: [
      { to: "/", label: t.home_nav_home },
      { to: "/services", label: t.home_nav_services },
      { to: "/artists", label: t.home_nav_artists },
      { to: "/about", label: t.home_nav_about },
      { to: "/contact", label: t.home_nav_contact },
    ],
    faq: t.home_nav_faq,
    book: t.home_nav_book,
    // By name, for the phone's tab bar
    home: t.home_nav_home,
    services: t.home_nav_services,
    artists: t.home_nav_artists,
    about: t.home_nav_about,
    contact: t.home_nav_contact,
  };
}
