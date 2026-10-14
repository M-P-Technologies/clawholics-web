import type { HomeOffer, HomeSections } from "../homeSections";
import { fillName, isBirthdayMonth } from "./birthday";
import { CLIENT_PATHS } from "./clientNav";

export interface OfferBanner extends HomeOffer {
  key: string;
  birthday: boolean;
}

/** Home's Special offers: the client's birthday banner first (in their birthday month), then the admin's */
export function homeOffers({ sections, dob, firstName, now }: { sections: HomeSections; dob?: string | null; firstName: string; now: number }): OfferBanner[] {
  const t = sections.text;
  const banners: OfferBanner[] = [];
  if (t.home_birthday_enabled !== "0" && isBirthdayMonth(dob, now)) {
    banners.push({
      key: "birthday",
      birthday: true,
      title: fillName(t.home_birthday_title, firstName),
      line: fillName(t.home_birthday_line, firstName),
      note: fillName(t.home_birthday_note, firstName),
      image: "",
      buttonLabel: "Book now",
      link: CLIENT_PATHS.explore,
    });
  }
  sections.offers.forEach((offer, i) => banners.push({ ...offer, key: `offer-${i}`, birthday: false }));
  return banners;
}
