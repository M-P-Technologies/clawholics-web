"use client";

import { CalendarCheck, CalendarHeart, Stamp } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { Link } from "@/lib/router";
import { Badge, Button, Card } from "@/components/atoms";
import { StatCard, StepTracker, TabSection } from "@/components/molecules";
import { ProfilePanel } from "@/components/organisms";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useMyAccount } from "../../hooks/client/useMyAccount";
import { completedVisits } from "../../lib/client/appointments";
import { fullName, memberSince, nextVisitHighlight, profileRows, rewardsLine } from "../../lib/client/profile";
import { clientTrackerSteps } from "../../lib/client/tracker";

const linkClass = "rounded-xl px-3 py-2.5 text-sm font-bold text-gray-red hover:bg-crimson-light/30";

export default function MyProfile() {
  const a = useMyAccount();
  const { openUserProfile, signOut } = useClerk();
  const u = a.dbUser!;
  const since = memberSince(u);
  const next = a.nextAppointment;

  return (
    <ClientScreen title="My profile">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <ProfilePanel
          label="Your profile"
          name={fullName(u)}
          imageUrl={a.clerkUser?.imageUrl ?? ""}
          badges={
            <>
              {since && <Badge tone="brand">Member since {since}</Badge>}
              <Badge>{a.stamps} {a.stamps === 1 ? "stamp" : "stamps"}</Badge>
            </>
          }
          highlight={nextVisitHighlight(next)}
          rowsTitle="Your details"
          rows={profileRows(u, a.formatDisplayDate)}
        >
          <Button type="button" onClick={a.handleEditClick} className="w-full">Edit details</Button>
          <Button variant="secondary" type="button" onClick={() => openUserProfile()} className="w-full">Manage account</Button>
          <Button variant="secondary" type="button" onClick={() => signOut({ redirectUrl: "/" })} className="w-full">Log out</Button>
        </ProfilePanel>

        <Card as="section" aria-label="Your account" className="flex min-w-0 flex-col gap-6">
          <TabSection title="At a glance" description="Your visits, your loyalty card and how long you've been with us.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard size="compact" icon={CalendarCheck} label="Visits" value={String(completedVisits(a.appointments))} hint="completed" />
              <StatCard size="compact" icon={Stamp} label="Loyalty stamps" value={`${a.stamps} / 10`} />
              <StatCard size="compact" icon={CalendarHeart} label="Member since" value={since || "—"} />
            </div>
          </TabSection>

          <TabSection title="Where your booking is" description="From booking to your visit.">
            {next ? (
              <StepTracker label="Booking progress" steps={clientTrackerSteps(next.appt)} />
            ) : (
              <p className="text-sm text-gray-red/70">No bookings to track yet.</p>
            )}
          </TabSection>

          <TabSection title="Loyalty card" description="A stamp for every visit; ten earn a reward.">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-berry">{rewardsLine(a.stamps)}</p>
              <Button type="button" variant="secondary" aria-label="Open your loyalty card" onClick={a.openRewards}>
                Open rewards
              </Button>
            </div>
          </TabSection>

          <nav aria-label="More" className="flex flex-wrap gap-1 border-t border-crimson-light/50 pt-3">
            <Link to="/tou" className={linkClass}>Terms</Link>
            <Link to="/privacy" className={linkClass}>Privacy</Link>
            <Link to="/" className={linkClass}>Back to site</Link>
          </nav>
        </Card>
      </div>
    </ClientScreen>
  );
}
