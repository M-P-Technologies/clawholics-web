"use client";

import { useClerk } from "@clerk/nextjs";
import { CalendarCheck, CalendarClock, Stamp } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import Button from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import StatCard from "../../components/ui/StatCard";
import TabSection from "../../components/ui/TabSection";
import BirthdayVoucherCard from "../../components/birthday/BirthdayVoucherCard";
import AppointmentSheet from "../../components/profile/AppointmentSheet";
import AppointmentsSection from "../../components/profile/AppointmentsSection";
import DetailsCard from "../../components/profile/DetailsCard";
import EditDetailsSheet from "../../components/profile/EditDetailsSheet";
import NextAppointmentCard from "../../components/profile/NextAppointmentCard";
import ProfileHeader from "../../components/profile/ProfileHeader";
import RewardsSheet from "../../components/profile/RewardsSheet";
import RewardsStrip from "../../components/profile/RewardsStrip";
import { CONTACT_METHOD_OPTIONS, contactMethodLabel } from "../../data/profile";
import { useBirthdayVoucher } from "../../hooks/useBirthdayVoucher";
import { useMyReviews } from "../../hooks/useMyReviews";
import { useProfile } from "../../hooks/useProfile";
import { useServicePhotos } from "../../hooks/useServicePhotos";

type ProfileTab = "overview" | "appointments";
const PROFILE_TABS: { value: ProfileTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "appointments", label: "Appointments" },
];

// The admin's card: milk white, soft border and shadow
const panelClass = "flex min-w-0 flex-col rounded-2xl border border-crimson-light/40 bg-milk shadow-petal";

// The client's own page, in two panels like the admin's client page: on the left who they are
// (photo, loyalty card, details, account), on the right their next appointment and counts, and
// every appointment.
export default function Profile() {
  const p = useProfile();
  const { openUserProfile, signOut } = useClerk();
  const photoFor = useServicePhotos();
  const { reviews, submit: submitReview } = useMyReviews();
  const birthday = useBirthdayVoucher();
  // undefined = not chosen yet: arriving for one appointment (after paying) shows that one
  const [chosenId, setOpenId] = useState<number | null | undefined>(undefined);
  const openId = chosenId === undefined ? p.highlightedAppointmentId : chosenId;
  const [rewardsOpen, setRewardsOpen] = useState(false);
  // Arriving for one appointment (after paying) opens on the list it is in
  const [tab, setTab] = useState<ProfileTab>(p.highlightedAppointmentId ? "appointments" : "overview");

  const { dbUser } = p;
  if (p.isBusy || !dbUser) {
    return <LoadingBar label="Loading your profile" />;
  }

  const openView = [...p.upcoming, ...p.pastViews].find((v) => v.appt.id === openId) ?? null;
  const memberSince = [dbUser.member_since_month, dbUser.member_since_year].filter(Boolean).join(" ");
  const detailRows = [
    { label: "Name", value: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(" ") },
    { label: "Email", value: dbUser.email ?? "" },
    { label: "Phone", value: dbUser.phone ?? "" },
    { label: "Date of birth", value: p.formatDisplayDate(dbUser.dob || "") },
    { label: "Gender", value: dbUser.gender ?? "" },
    { label: "Other phone", value: dbUser.alt_phone ?? "" },
    { label: "Instagram", value: dbUser.instagram_handle ? `@${dbUser.instagram_handle}` : "" },
    { label: "Facebook", value: dbUser.facebook_handle ?? "" },
    { label: "Reach me by", value: contactMethodLabel(dbUser.preferred_contact_method) },
  ];
  const hero = p.nextAppointment;

  const completedVisits = (p.appointments ?? []).filter((a) => a.status.trim().toUpperCase() === "COMPLETED").length;
  const reviewedIds = new Set(Object.keys(reviews).map(Number));

  return (
    <>
      <PageShell>
        <Section innerClassName="max-w-6xl">
          {/* Two panels, like the admin's client page: who you are on the left, your visits on the right */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <aside aria-label="Your profile" className={`${panelClass} gap-5 p-5 lg:sticky lg:top-24 lg:max-h-[80vh] lg:overflow-y-auto`}>
              <ProfileHeader firstName={dbUser.first_name ?? ""} imageUrl={p.clerkUser?.imageUrl ?? ""} memberSince={memberSince} />
              <RewardsStrip stamps={p.stamps} onOpen={() => setRewardsOpen(true)} />
              <DetailsCard rows={detailRows} onEdit={p.handleEditClick} />
              <div className="flex flex-col gap-2 border-t border-crimson-light/50 pt-4">
                <Button variant="secondary" type="button" onClick={() => openUserProfile()} className="w-full">Manage account</Button>
                <Button variant="secondary" type="button" onClick={() => signOut({ redirectUrl: "/" })} className="w-full">Log out</Button>
              </div>
            </aside>

            <section aria-label="Your visits" className={`${panelClass} overflow-clip lg:min-h-[80vh]`}>
              <div role="tablist" aria-label="Profile sections" className="flex shrink-0 overflow-x-auto overflow-y-hidden border-b border-crimson-light/50 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {PROFILE_TABS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    id={`profile-tab-${t.value}`}
                    aria-selected={tab === t.value}
                    aria-controls={`profile-panel-${t.value}`}
                    onClick={() => setTab(t.value)}
                    className={clsx(
                      "shrink-0 whitespace-nowrap border-b-2 px-4 py-3.5 text-[14px] font-bold transition-colors",
                      tab === t.value ? "border-crimson text-berry" : "border-transparent text-gray-red/70 hover:text-berry",
                    )}
                  >
                    {t.label}
                    {t.value === "appointments" && <span className="ml-1.5 rounded-full bg-crimson-light/50 px-1.5 text-[11px] text-berry">{p.upcoming.length}</span>}
                  </button>
                ))}
              </div>

              <div role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`} className="flex flex-col gap-6 p-5">
                {tab === "overview" && (
                  <>
                    {birthday.voucher && (
                      <BirthdayVoucherCard
                        voucher={birthday.voucher}
                        onClaim={() => birthday.claim().catch(() => {})}
                        isClaiming={birthday.isClaiming}
                        error={birthday.claimError?.message}
                      />
                    )}
                    <NextAppointmentCard
                      view={hero}
                      photo={hero ? photoFor(hero.appt.service_name) : ""}
                      now={p.currentTime}
                      onPay={() => hero && p.payForAppointment(hero.appt)}
                      onReschedule={() => hero && p.rescheduleAppointment(hero.appt)}
                      onCancel={() => hero && p.startCancel(hero.appt)}
                    />
                    <TabSection title="At a glance" description="Your visits with us and your loyalty card.">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <StatCard icon={CalendarClock} label="Coming up" value={String(p.upcoming.length)} hint={p.upcoming.length === 1 ? "appointment" : "appointments"} />
                        <StatCard icon={CalendarCheck} label="Visits" value={String(completedVisits)} hint="completed" />
                        <StatCard icon={Stamp} label="Loyalty stamps" value={`${Math.min(p.stamps, 10)} / 10`} />
                      </div>
                    </TabSection>
                  </>
                )}

                {tab === "appointments" && (
                  <TabSection title="My appointments" description="Open one to see its details, pay, reschedule, or leave a review after your visit.">
                    <AppointmentsSection
                      upcoming={p.upcoming}
                      past={p.pastViews}
                      photoFor={photoFor}
                      highlightedId={p.highlightedAppointmentId}
                      onOpen={(view) => setOpenId(view.appt.id)}
                      historyFilter={p.historyFilter}
                      onFilterChange={p.handleHistoryFilterChange}
                      historySort={p.historySortBy}
                      onSortChange={p.handleHistorySortChange}
                      hasMore={p.hasMoreHistory}
                      showAll={p.showAllHistory}
                      onToggleAll={p.toggleHistory}
                      reviewedIds={reviewedIds}
                    />
                  </TabSection>
                )}
              </div>
            </section>
          </div>
        </Section>
      </PageShell>

      <AppointmentSheet
        view={openView}
        photo={openView ? photoFor(openView.appt.service_name) : ""}
        now={p.currentTime}
        tokenFetcher={p.getToken}
        clerkId={p.clerkUser?.id}
        onClose={() => setOpenId(null)}
        onPay={() => openView && p.payForAppointment(openView.appt)}
        onReschedule={() => openView && p.rescheduleAppointment(openView.appt)}
        onCancel={() => {
          if (!openView) return;
          setOpenId(null);
          p.startCancel(openView.appt);
        }}
        onProofUploaded={p.handleProofUploaded}
        review={openView ? reviews[openView.appt.id] : undefined}
        onSubmitReview={submitReview}
      />
      <RewardsSheet
        open={rewardsOpen}
        onClose={() => setRewardsOpen(false)}
        stamps={p.stamps}
        cardNumber={p.loyaltyCardNumber}
        clerkId={p.clerkUser?.id}
        onRedeem={() => {
          setRewardsOpen(false);
          p.handleClientRedeem();
        }}
      />
      <EditDetailsSheet
        open={p.isEditing}
        error={p.error}
        fields={p.profileFields}
        genderLabel={p.genderLabel}
        genderOptions={p.genderOptions}
        genderValue={p.formData?.gender}
        isGenderOpen={p.isGenderOpen}
        onToggleGender={p.toggleGender}
        onSelectGender={p.handleGenderSelect}
        contactMethod={p.formData?.preferred_contact_method ?? ""}
        contactMethodOptions={CONTACT_METHOD_OPTIONS}
        onSelectContactMethod={p.handleContactMethodSelect}
        onSave={p.handleSave}
        onCancel={p.handleCancel}
      />

      {/* THE REWARD MODAL */}
      {p.showRewardModal && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 sm:px-8 drawer-backdrop max-sm:p-0">
          <div className="bg-light-orange border border-crimson-light rounded-sm p-8 md:p-12 max-w-2xl w-full text-center text-gray-red shadow-2xl relative flex flex-col items-center gap-4 md:gap-8 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
            <h1 className="font-display text-3xl font-normal uppercase tracking-widest text-gray-red md:text-4xl">
              Congratulations, {dbUser.first_name}!
            </h1>
            <p className="font-sans text-base md:text-xl opacity-90">
              You just completed your stamp card on{" "}
              <span className="font-bold">{p.todayFormatted}</span>!
            </p>
            <p className="font-sans text-sm md:text-xl opacity-80">
              You received a 30% off discount your next appointment! Please check your email to view the official confirmation for your reward. 
              You may show this message or the email to a staff member to claim your discount on your next visit.
            </p>
            <Button
              onClick={p.closeRewardModal}
              className="px-8 sm:px-12"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {p.isCancelModalOpen && p.selectedAppt && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
          <div className="bg-light-orange border border-crimson-light rounded-sm p-8 md:p-8 max-w-md w-full text-gray-red shadow-xl flex flex-col gap-4 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
            <h1 className="font-display text-2xl font-normal uppercase tracking-widest text-gray-red">Cancel appointment?</h1>
            <p className="opacity-80">
              Are you sure you want to cancel your appointment for{" "}
              <strong>{p.selectedAppt.service_name}</strong> on{" "}
              <strong>
                {p.selectedApptDateLabel}
              </strong>
              ?
            </p>

            {p.isLateCancellation ? (
              <div className="bg-danger/10 border-l-4 border-danger text-gray-red p-4 text-sm text-left rounded-r-sm">
                <strong>Late Cancellation</strong>
                <br />
                This is within 3 days of your appointment. Per our salon policy,
                this cancellation is non-refundable. If you proceed, your slot
                will be forfeited.
              </div>
            ) : (
              <p className="text-sm italic text-gray-red">
                Note: Cancellations must be made at least 3 days in advance to
                be eligible for a refund.
              </p>
            )}

            {p.actionError && (
              <div className="p-4 bg-danger/10 border border-danger/40 text-danger rounded text-sm">
                {p.actionError}
              </div>
            )}

            <div className="flex flex-row justify-end gap-4">
              <Button
                variant="bare"
                onClick={p.closeCancelModal}
                disabled={p.isCancelling}
                className={`px-4 py-2 rounded-md border border-crimson text-sm uppercase tracking-widest font-bold ${
                  p.isCancelling
                    ? "opacity-30 cursor-not-allowed"
                    : "opacity-70 hover:bg-crimson-light"
                }`}
              >
                Back
              </Button>
              <Button
                variant="bare"
                onClick={p.handleCancelAppointment}
                disabled={p.isCancelling}
                className={`px-4 py-2 rounded-md text-sm uppercase tracking-widest font-bold shadow-md transition-colors ${
                  p.isCancelling
                    ? "bg-crimson/30 text-light-orange cursor-wait"
                    : "bg-crimson text-light-orange hover:bg-crimson/80"
                }`}
              >
                {p.isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
