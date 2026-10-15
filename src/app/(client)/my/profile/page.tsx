"use client";

import { CalendarCheck, CalendarHeart, Stamp } from "lucide-react";
import { Link } from "@/lib/router";
import { Badge, Button, Card } from "@/components/atoms";
import { StatCard, StepTracker, TabSection } from "@/components/molecules";
import { ProfilePanel } from "@/components/organisms";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { useMyProfile } from "@/hooks/client/useMyProfile";
import { profileLinkClass } from "@/lib/client/profile";

export default function MyProfile() {
  const p = useMyProfile();
  const a = p.account;

  return (
    <ClientScreen title="My profile">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <ProfilePanel
          label="Your profile"
          name={p.name}
          imageUrl={p.imageUrl}
          badges={
            <>
              {p.since && <Badge tone="brand">Member since {p.since}</Badge>}
              <Badge>{p.stampsLabel}</Badge>
            </>
          }
          highlight={p.highlight}
          rowsTitle="Your details"
          rows={p.rows}
        >
          <Button type="button" onClick={a.handleEditClick} className="w-full">Edit details</Button>
          <Button variant="secondary" type="button" onClick={p.manageAccount} className="w-full">Manage account</Button>
          <Button variant="secondary" type="button" onClick={p.logOut} className="w-full">Log out</Button>
        </ProfilePanel>

        <Card as="section" aria-label="Your account" className="flex min-w-0 flex-col gap-6">
          <TabSection title="At a glance" description="Your visits, your loyalty card and how long you've been with us.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard size="compact" icon={CalendarCheck} label="Visits" value={p.visits} hint="completed" />
              <StatCard size="compact" icon={Stamp} label="Loyalty stamps" value={p.stampsValue} />
              <StatCard size="compact" icon={CalendarHeart} label="Member since" value={p.sinceLabel} />
            </div>
          </TabSection>

          <TabSection title="Where your booking is" description="From booking to your visit.">
            {p.trackerSteps ? (
              <StepTracker label="Booking progress" steps={p.trackerSteps} />
            ) : (
              <p className="text-sm text-gray-red/70">No bookings to track yet.</p>
            )}
          </TabSection>

          <TabSection title="Loyalty card" description="A stamp for every visit; ten earn a reward.">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-berry">{p.rewardsLine}</p>
              <Button type="button" variant="secondary" aria-label="Open your loyalty card" onClick={a.openRewards}>
                Open rewards
              </Button>
            </div>
          </TabSection>

          <nav aria-label="More" className="flex flex-wrap gap-1 border-t border-crimson-light/50 pt-3">
            <Link to="/tou" className={profileLinkClass}>Terms</Link>
            <Link to="/privacy" className={profileLinkClass}>Privacy</Link>
            <Link to="/" className={profileLinkClass}>Back to site</Link>
          </nav>
        </Card>
      </div>
    </ClientScreen>
  );
}
