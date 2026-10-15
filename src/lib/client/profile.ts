import { CalendarClock, Cake, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/atoms";
import { contactMethodLabel } from "@/data/profile";
import type { UserProfile } from "@/services/userService";
import type { AppointmentView } from "@/types/profile";
import { DEFAULT_STAMP_TARGET, stampsToGo } from "@/utils/profileView";

/** "October 2026", or "" when unknown */
export const memberSince = (u: UserProfile) => [u.member_since_month, u.member_since_year].filter(Boolean).join(" ");

/** The client's details for the profile panel; empty ones are left out by the panel */
export const profileRows = (u: UserProfile, formatDate: (ymd: string) => string) => [
  { label: "Email", value: u.email ?? "", icon: Mail },
  { label: "Phone", value: u.phone ?? "", icon: Phone },
  { label: "Other phone", value: u.alt_phone ?? "", icon: Phone },
  { label: "Date of birth", value: u.dob ? formatDate(u.dob) : "", icon: Cake },
  { label: "Gender", value: u.gender ?? "", icon: UserRound },
  { label: "Instagram", value: u.instagram_handle ? `@${u.instagram_handle}` : "", icon: InstagramIcon },
  { label: "Facebook", value: u.facebook_handle ?? "", icon: FacebookIcon },
  { label: "Reach me by", value: contactMethodLabel(u.preferred_contact_method), icon: MessageCircle },
];

/** The profile panel's next-visit box */
export const nextVisitHighlight = (next: AppointmentView | null | undefined) => ({
  title: "Next visit",
  icon: CalendarClock,
  value: next?.dateLabel,
  detail: next ? `${next.timeLabel} · ${next.appt.service_name} with ${next.appt.nailist_name}` : undefined,
  empty: "Nothing booked ahead.",
});

/** How far the loyalty card is from a reward */
export const rewardsLine = (stamps: number, target = DEFAULT_STAMP_TARGET) => {
  const left = stampsToGo(stamps, target);
  return left === 0 ? "Your reward is ready. Tap to redeem it." : `${left} more visit${left === 1 ? "" : "s"} to a reward`;
};

/** "Ana Cruz", or "You" when no name is set */
export const fullName = (u: UserProfile) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "You";

/** The More links at the foot of the Profile screen */
export const profileLinkClass = "rounded-xl px-3 py-3 text-sm font-bold text-gray-red hover:bg-crimson-light/30";
