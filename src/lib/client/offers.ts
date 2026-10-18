import type { HomeOffer, HomeSections } from "../homeSections";
import { fillName, isBirthdayMonth } from "./birthday";
import { CLIENT_PATHS } from "./clientNav";

interface OfferBanner extends HomeOffer {
  key: string;
  birthday: boolean;
}

/** The birthday banner once this year's voucher was used at the salon: a thank-you, nothing to book */
export const BIRTHDAY_USED_LINE = "You've used your birthday treat this year. Thanks for celebrating with us!";

/**
 * Home's Special offers: the client's birthday banner first (in their birthday month), then the
 * admin's. With the birthday voucher already used, the banner says so instead of offering it.
 */
export function homeOffers({
  sections,
  dob,
  firstName,
  now,
  birthdayUsed = false,
}: {
  sections: HomeSections;
  dob?: string | null;
  firstName: string;
  now: number;
  birthdayUsed?: boolean;
}): OfferBanner[] {
  const t = sections.text;
  const banners: OfferBanner[] = [];
  if (t.home_birthday_enabled !== "0" && isBirthdayMonth(dob, now)) {
    banners.push({
      key: "birthday",
      birthday: true,
      title: fillName(t.home_birthday_title, firstName),
      line: birthdayUsed ? BIRTHDAY_USED_LINE : fillName(t.home_birthday_line, firstName),
      note: birthdayUsed ? "" : fillName(t.home_birthday_note, firstName),
      image: "",
      buttonLabel: birthdayUsed ? "" : "Book now",
      link: birthdayUsed ? "" : CLIENT_PATHS.explore,
    });
  }
  sections.offers.forEach((offer, i) => banners.push({ ...offer, key: `offer-${i}`, birthday: false }));
  return banners;
}
