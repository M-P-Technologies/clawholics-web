"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import Button from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import AppointmentSheet from "../../components/profile/AppointmentSheet";
import AppointmentsSection from "../../components/profile/AppointmentsSection";
import DetailsCard from "../../components/profile/DetailsCard";
import EditDetailsSheet from "../../components/profile/EditDetailsSheet";
import NextAppointmentCard from "../../components/profile/NextAppointmentCard";
import ProfileHeader from "../../components/profile/ProfileHeader";
import RewardsSheet from "../../components/profile/RewardsSheet";
import RewardsStrip from "../../components/profile/RewardsStrip";
import { CONTACT_METHOD_OPTIONS, contactMethodLabel } from "../../data/profile";
import { useMyReviews } from "../../hooks/useMyReviews";
import { useProfile } from "../../hooks/useProfile";
import { useServicePhotos } from "../../hooks/useServicePhotos";

export default function Profile() {
  const p = useProfile();
  const { openUserProfile, signOut } = useClerk();
  const photoFor = useServicePhotos();
  const { reviews, submit: submitReview } = useMyReviews();
  // undefined = not chosen yet: arriving for one appointment (after paying) shows that one
  const [chosenId, setOpenId] = useState<number | null | undefined>(undefined);
  const openId = chosenId === undefined ? p.highlightedAppointmentId : chosenId;
  const [rewardsOpen, setRewardsOpen] = useState(false);

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

  return (
    <>
      <PageShell>
        <Section innerClassName="max-w-5xl gap-4 md:gap-8">
          <ProfileHeader firstName={dbUser.first_name ?? ""} imageUrl={p.clerkUser?.imageUrl ?? ""} memberSince={memberSince} />

          {/* Phones: one column in reading order. From lg: the wrappers become two columns. */}
          <div className="flex flex-col gap-4 md:gap-8 lg:grid lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div className="contents lg:flex lg:flex-col lg:gap-8">
              <div className="order-2"><RewardsStrip stamps={p.stamps} onOpen={() => setRewardsOpen(true)} /></div>
              <div className="order-4"><DetailsCard rows={detailRows} onEdit={p.handleEditClick} /></div>
            </div>
            <div className="contents lg:flex lg:flex-col lg:gap-8">
              <div className="order-1">
                <NextAppointmentCard
                  view={hero}
                  photo={hero ? photoFor(hero.appt.service_name) : ""}
                  now={p.currentTime}
                  onPay={() => hero && p.payForAppointment(hero.appt)}
                  onReschedule={() => hero && p.rescheduleAppointment(hero.appt)}
                  onCancel={() => hero && p.startCancel(hero.appt)}
                />
              </div>
              <div className="order-3">
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
                  reviewedIds={new Set(Object.keys(reviews).map(Number))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="secondary" type="button" onClick={() => openUserProfile()} className="w-full sm:w-auto">Manage account</Button>
            <Button variant="secondary" type="button" onClick={() => signOut({ redirectUrl: "/" })} className="w-full sm:w-auto">Log out</Button>
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
