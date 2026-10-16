"use client";

import type { Dispatch, SetStateAction } from "react";
import AppointmentSheet from "@/components/features/client/appointments/AppointmentSheet";
import EditDetailsSheet from "@/components/features/client/profile/EditDetailsSheet";
import { Button } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { CONTACT_METHOD_OPTIONS } from "@/data/profile";
import type { MyAccount } from "@/hooks/client/useMyAccount";

interface AccountOverlaysProps {
  account: MyAccount;
  openId: number | null;
  setOpenId: Dispatch<SetStateAction<number | null | undefined>>;
}

// The sheets and pop-ups every tab can open (an appointment, the details form,
// the reward and cancel dialogs), drawn once for the whole app by MyAccountProvider.
export default function AccountOverlays({ account: a, openId, setOpenId }: AccountOverlaysProps) {
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
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-3 sm:px-9 drawer-backdrop max-sm:p-0">
          <div className="bg-light-orange border border-crimson-light rounded-sm p-9 md:p-12 max-w-2xl w-full text-center text-gray-red shadow-2xl relative flex flex-col items-center gap-3 md:gap-9 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
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
              className="px-9 sm:px-12"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION: the library's alert dialog, like the other messages in the app. It
          can't be dismissed while the cancellation runs */}
      <Dialog
        open={a.isCancelModalOpen && Boolean(a.selectedAppt)}
        onClose={a.closeCancelModal}
        title="Cancel appointment?"
        role="alertdialog"
        size="md"
        dismissible={!a.isCancelling}
        hideClose
      >
        {a.selectedAppt && (
          <>
            <p className="text-left leading-relaxed text-gray-red">
              Are you sure you want to cancel your appointment for <strong>{a.selectedAppt.service_name}</strong> on{" "}
              <strong>{a.selectedApptDateLabel}</strong>?
            </p>
            {a.isLateCancellation ? (
              <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-gray-red">
                <strong>Late cancellation.</strong> This is within 3 days of your appointment. Per our salon policy,
                this cancellation is non-refundable. If you go ahead, your slot is forfeited.
              </p>
            ) : (
              <p className="text-sm text-gray-red">Cancellations made at least 3 days in advance are eligible for a refund.</p>
            )}
            {a.actionError && (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger-ink">{a.actionError}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={a.closeCancelModal} disabled={a.isCancelling}>Back</Button>
              <Button onClick={a.handleCancelAppointment} loading={a.isCancelling} loadingText="Cancelling...">Confirm cancel</Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
