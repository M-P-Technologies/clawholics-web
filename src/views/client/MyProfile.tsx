"use client";

import { useClerk } from "@clerk/nextjs";
import { Link } from "@/lib/router";
import DetailsCard from "@/components/features/client/profile/DetailsCard";
import ProfileHeader from "@/components/features/client/profile/ProfileHeader";
import RewardsStrip from "@/components/features/client/home/RewardsStrip";
import { Button } from "@/components/atoms";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { contactMethodLabel } from "../../data/profile";
import { useMyAccount } from "../../hooks/client/useMyAccount";

const linkClass = "rounded-xl px-3 py-2.5 text-sm font-bold text-gray-red hover:bg-crimson-light/30";

export default function MyProfile() {
  const a = useMyAccount();
  const { openUserProfile, signOut } = useClerk();
  const u = a.dbUser!;
  const memberSince = [u.member_since_month, u.member_since_year].filter(Boolean).join(" ");
  const rows = [
    { label: "Name", value: [u.first_name, u.last_name].filter(Boolean).join(" ") },
    { label: "Email", value: u.email ?? "" },
    { label: "Phone", value: u.phone ?? "" },
    { label: "Date of birth", value: a.formatDisplayDate(u.dob || "") },
    { label: "Gender", value: u.gender ?? "" },
    { label: "Other phone", value: u.alt_phone ?? "" },
    { label: "Instagram", value: u.instagram_handle ? `@${u.instagram_handle}` : "" },
    { label: "Facebook", value: u.facebook_handle ?? "" },
    { label: "Reach me by", value: contactMethodLabel(u.preferred_contact_method) },
  ];

  return (
    <ClientScreen title="My profile">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section aria-label="Your profile" className="flex flex-col gap-5 rounded-2xl bg-milk p-5 shadow-petal">
          <ProfileHeader firstName={u.first_name ?? ""} imageUrl={a.clerkUser?.imageUrl ?? ""} memberSince={memberSince} />
          <RewardsStrip stamps={a.stamps} onOpen={a.openRewards} />
        </section>

        <section aria-label="Your details" className="flex flex-col gap-4 rounded-2xl bg-milk p-5 shadow-petal">
          <DetailsCard rows={rows} onEdit={a.handleEditClick} />
          <nav aria-label="More" className="flex flex-col border-t border-crimson-light/50 pt-3">
            <Link to="/tou" className={linkClass}>Terms</Link>
            <Link to="/privacy" className={linkClass}>Privacy</Link>
            <Link to="/" className={linkClass}>Back to site</Link>
          </nav>
          <div className="flex flex-col gap-2 border-t border-crimson-light/50 pt-4">
            <Button variant="secondary" type="button" onClick={() => openUserProfile()} className="w-full">Manage account</Button>
            <Button variant="secondary" type="button" onClick={() => signOut({ redirectUrl: "/" })} className="w-full">Log out</Button>
          </div>
        </section>
      </div>
    </ClientScreen>
  );
}
