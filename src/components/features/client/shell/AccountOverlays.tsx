"use client";

import type { Dispatch, SetStateAction } from "react";
import AppointmentSheet from "@/components/features/client/appointments/AppointmentSheet";
import EditDetailsSheet from "@/components/features/client/profile/EditDetailsSheet";
import RewardsSheet from "@/components/features/client/profile/RewardsSheet";
import { Button } from "@/components/atoms";
import { CONTACT_METHOD_OPTIONS } from "@/data/profile";
import type { MyAccount } from "@/hooks/client/useMyAccount";

interface AccountOverlaysProps {
  account: MyAccount;
  openId: number | null;
  setOpenId: Dispatch<SetStateAction<number | null | undefined>>;
  rewardsOpen: boolean;
  setRewardsOpen: (open: boolean) => void;
}

// The sheets and pop-ups every tab can open (an appointment, the loyalty card, the details form,
// the reward and cancel dialogs), drawn once for the whole app by MyAccountProvider.
export default function AccountOverlays({ account: a, openId, setOpenId, rewardsOpen, setRewardsOpen }: AccountOverlaysProps) {
  const openView = [...a.upcoming, ...a.pastViews].find((v) => v.appt.id === openId) ?? null;

  return (
    <>
      <AppointmentSheet
        view={openView}
        now={a.currentTime}
        tokenFetcher={a.getToken}
        clerkId={a.clerkUser?.id}
        onClose={() => setOpenId(null)}
        onPay={() => openView && a.payForAppointment(openView.appt)}
        onReschedule={() => openView && a.rescheduleAppointment(openView.appt)}
        onCancel={() => {
          if (!openView) return;
          setOpenId(null);
          a.startCancel(openView.appt);
        }}
        onProofUploaded={a.handleProofUploaded}
        review={openView ? a.reviews[openView.appt.id] : undefined}
        onSubmitReview={a.submitReview}
      />
      <RewardsSheet
        open={rewardsOpen}
        onClose={() => setRewardsOpen(false)}
        stamps={a.stamps}
        target={a.stampTarget}
        cardNumber={a.loyaltyCardNumber}
        clerkId={a.clerkUser?.id}
        onRedeem={() => {
          setRewardsOpen(false);
          a.handleClientRedeem();
        }}
      />
      <EditDetailsSheet
        open={a.isEditing}
        error={a.error}
        fields={a.profileFields}
        genderLabel={a.genderLabel}
        genderOptions={a.genderOptions}
        genderValue={a.formData?.gender}
        isGenderOpen={a.isGenderOpen}
        onToggleGender={a.toggleGender}
        onSelectGender={a.handleGenderSelect}
        contactMethod={a.formData?.preferred_contact_method ?? ""}
        contactMethodOptions={CONTACT_METHOD_OPTIONS}
        onSelectContactMethod={a.handleContactMethodSelect}
        onSave={a.handleSave}
        onCancel={a.handleCancel}
      />

      {/* THE REWARD MODAL */}
      {a.showRewardModal && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 sm:px-8 drawer-backdrop max-sm:p-0">
          <div className="bg-light-orange border border-crimson-light rounded-sm p-8 md:p-12 max-w-2xl w-full text-center text-gray-red shadow-2xl relative flex flex-col items-center gap-4 md:gap-8 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
            <h1 className="font-display text-3xl font-normal uppercase tracking-widest text-gray-red md:text-4xl">
              Congratulations, {a.dbUser?.first_name}!
            </h1>
            <p className="font-sans text-base md:text-xl opacity-90">
              You just completed your stamp card on{" "}
              <span className="font-bold">{a.todayFormatted}</span>!
            </p>
            <p className="font-sans text-sm md:text-xl opacity-80">
              You received a 30% off discount your next appointment! Please check your email to view the official confirmation for your reward.
              You may show this message or the email to a staff member to claim your discount on your next visit.
            </p>
            <Button
              onClick={a.closeRewardModal}
              className="px-8 sm:px-12"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {a.isCancelModalOpen && a.selectedAppt && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
          <div className="bg-light-orange border border-crimson-light rounded-sm p-8 md:p-8 max-w-md w-full text-gray-red shadow-xl flex flex-col gap-4 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
            <h1 className="font-display text-2xl font-normal uppercase tracking-widest text-gray-red">Cancel appointment?</h1>
            <p className="opacity-80">
              Are you sure you want to cancel your appointment for{" "}
              <strong>{a.selectedAppt.service_name}</strong> on{" "}
              <strong>
                {a.selectedApptDateLabel}
              </strong>
              ?
            </p>

            {a.isLateCancellation ? (
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

            {a.actionError && (
              <div className="p-4 bg-danger/10 border border-danger/40 text-danger rounded text-sm">
                {a.actionError}
              </div>
            )}

            <div className="flex flex-row justify-end gap-4">
              <Button
                variant="bare"
                onClick={a.closeCancelModal}
                disabled={a.isCancelling}
                className={`px-4 py-2 rounded-md border border-crimson text-sm uppercase tracking-widest font-bold ${
                  a.isCancelling
                    ? "opacity-30 cursor-not-allowed"
                    : "opacity-70 hover:bg-crimson-light"
                }`}
              >
                Back
              </Button>
              <Button
                variant="bare"
                onClick={a.handleCancelAppointment}
                disabled={a.isCancelling}
                className={`px-4 py-2 rounded-md text-sm uppercase tracking-widest font-bold shadow-md transition-colors ${
                  a.isCancelling
                    ? "bg-crimson/30 text-light-orange cursor-wait"
                    : "bg-crimson text-light-orange hover:bg-crimson/80"
                }`}
              >
                {a.isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
