"use client";

import type { Dispatch, SetStateAction } from "react";
import AppointmentSheet from "@/components/features/client/appointments/AppointmentSheet";
import EditDetailsSheet from "@/components/features/client/profile/EditDetailsSheet";
import { Button } from "@/components/atoms";
import { ConfirmDialog, Dialog } from "@/components/organisms";
import { FOOTER_ACTIONS_CLASS } from "@/components/organisms/FooterActions";
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
        // The sheet is drawn for every tab, so it's closed before going to another page
        onPay={() => {
          if (!openView) return;
          setOpenId(null);
          a.payForAppointment(openView.appt);
        }}
        onReschedule={() => {
          if (!openView) return;
          setOpenId(null);
          a.rescheduleAppointment(openView.appt);
        }}
        onCancel={() => {
          if (!openView) return;
          setOpenId(null);
          a.startCancel(openView.appt);
        }}
        onDelete={() => {
          if (!openView) return;
          setOpenId(null);
          a.setDeleteTarget(openView.appt);
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
      <Dialog
        open={a.showRewardModal}
        onClose={a.closeRewardModal}
        title={`Congratulations, ${a.dbUser?.first_name ?? ""}!`}
        size="md"
        hideClose
        header={
          <h2 className="text-center font-display text-3xl font-normal uppercase tracking-widest text-gray-red">
            Congratulations, {a.dbUser?.first_name}!
          </h2>
        }
        footer={
          <div className={FOOTER_ACTIONS_CLASS}>
            <Button onClick={a.closeRewardModal}>Continue</Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center text-gray-red">
          <p className="font-sans text-base md:text-lg">
            You just completed your stamp card on <span className="font-bold">{a.todayFormatted}</span>!
          </p>
          <p className="font-sans text-sm md:text-base">
            You received a 30% off discount your next appointment! Please check your email to view the official confirmation for your reward.
            You may show this message or the email to a staff member to claim your discount on your next visit.
          </p>
        </div>
      </Dialog>

      {/* DELETE CONFIRMATION: a cancelled appointment leaves the client's list (the salon keeps its records) */}
      <ConfirmDialog
        open={Boolean(a.deleteTarget)}
        title="Delete appointment?"
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        cancelLabel="Back"
        loading={a.isDeleting}
        onConfirm={a.confirmDelete}
        onClose={a.closeDelete}
      >
        <p>
          Delete your cancelled <strong>{a.deleteTarget?.service_name}</strong> appointment from your list? This can&apos;t be undone.
        </p>
      </ConfirmDialog>

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
        footer={
          <div className={FOOTER_ACTIONS_CLASS}>
            <Button variant="secondary" onClick={a.closeCancelModal} disabled={a.isCancelling}>Back</Button>
            <Button onClick={a.handleCancelAppointment} loading={a.isCancelling} loadingText="Cancelling...">Confirm cancel</Button>
          </div>
        }
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
          </>
        )}
      </Dialog>
    </>
  );
}
