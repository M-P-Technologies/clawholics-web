"use client";

import { CalendarCheck, CalendarHeart, Stamp } from "lucide-react";
import { Badge, Button, Card } from "@/components/atoms";
import { StatCard, StepTracker, TabSection, Tabs } from "@/components/molecules";
import NotificationsPanel from "@/components/features/client/profile/NotificationsPanel";
import LoyaltyCard from "@/components/features/client/profile/LoyaltyCard";
import { ProfilePanel } from "@/components/organisms";
import ClientScreen from "@/components/features/client/shell/ClientScreen";
import { RowsSkeleton } from "@/components/features/client/skeletons/skeletons";
import { useMyProfile } from "@/hooks/client/useMyProfile";
import { profileLinkClass } from "@/lib/client/profile";

export default function MyProfile() {
  const p = useMyProfile();
  const a = p.account;

  return (
    <ClientScreen title="My profile">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
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
          {/* Edit and Manage side by side while they fit; Log out only on phones (from `sm` it's in the sidebar), on its own row */}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={a.handleEditClick} className="grow">Edit details</Button>
            <Button variant="secondary" type="button" onClick={p.manageAccount} className="grow">Manage account</Button>
            <Button variant="secondary" type="button" onClick={p.logOut} className="w-full sm:hidden">Log out</Button>
          </div>
        </ProfilePanel>

        <Card as="section" aria-label="Your account" padding="none" className="flex min-w-0 flex-col overflow-clip lg:col-span-2">
          <Tabs label="Your account" idPrefix="account" value={p.tab} onChange={p.setTab} tabs={p.tabs} />
          <div role="tabpanel" id={`account-panel-${p.tab}`} aria-labelledby={`account-tab-${p.tab}`} className="flex min-w-0 flex-col gap-6 p-6">
            {p.tab === "overview" ? (
              <>
                <TabSection title="At a glance" description="Your visits, your loyalty card and how long you've been with us.">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard size="compact" icon={CalendarCheck} label="Visits" value={p.visits} hint="completed" />
                    <StatCard size="compact" icon={Stamp} label="Loyalty stamps" value={p.stampsValue} />
                    <StatCard size="compact" icon={CalendarHeart} label="Member since" value={p.sinceLabel} className="col-span-2 sm:col-span-1" />
                  </div>
                </TabSection>

                <TabSection title="Where your booking is" description="From booking to your visit.">
                  {p.trackerSteps ? (
                    <StepTracker label="Booking progress" steps={p.trackerSteps} />
                  ) : a.appointmentsLoading ? (
                    <RowsSkeleton label="Loading your bookings" plain />
                  ) : (
                    <p className="text-sm text-gray-red">No bookings to track yet.</p>
                  )}
                </TabSection>
              </>
            ) : p.tab === "reminders" ? (
              <NotificationsPanel
                waiting={p.reminders.waiting}
                loading={p.reminders.loadingWaiting}
                failed={p.reminders.waitingFailed}
                leaving={p.reminders.leaving}
                onLeave={p.reminders.leave}
                rebookEmails={p.reminders.rebookEmails}
                savingRebook={p.reminders.savingRebook}
                onRebookEmails={p.reminders.setRebookEmails}
              />
            ) : (
              <TabSection title="Loyalty card" description={`A stamp for every visit. ${p.rewardsLine}`}>
                <LoyaltyCard stamps={a.stamps} target={a.stampTarget} cardNumber={a.loyaltyCardNumber} clerkId={a.clerkUser?.id} onRedeem={a.handleClientRedeem} />
              </TabSection>
            )}

            {/* The public site's pages open in a new tab, keeping the app open */}
            <nav aria-label="More" className="flex flex-wrap gap-1">
              <a href="/tou" target="_blank" rel="noopener noreferrer" className={profileLinkClass}>Terms<span className="sr-only"> (opens in a new tab)</span></a>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className={profileLinkClass}>Privacy<span className="sr-only"> (opens in a new tab)</span></a>
              <a href="/" target="_blank" rel="noopener noreferrer" className={profileLinkClass}>Back to site<span className="sr-only"> (opens in a new tab)</span></a>
            </nav>
          </div>
        </Card>
      </div>
    </ClientScreen>
  );
}
