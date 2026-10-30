import { ConfirmDialog } from "@/components/organisms";
import { cancelOutcome, type CancellableBooking } from "@/lib/admin/cancelBooking";
import { dateLabel } from "@/lib/admin/clientPage";
import { peso } from "@/lib/dashboardFormat";
import { timeRangeLabel } from "@/lib/timeFormat";

interface CancelBookingDialogProps {
  open: boolean;
  booking: CancellableBooking & { service_name?: string };
  /** "Audit Tester", for the question; "The client" without it */
  clientName?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Asks before an admin cancels a booking, saying what happens to the downpayment by the terms:
// refunded when the visit is 72+ hours away, kept inside that, and nothing to give back when unpaid
export default function CancelBookingDialog({ open, booking, clientName, loading, onConfirm, onClose }: CancelBookingDialogProps) {
  const outcome = cancelOutcome(booking);
  const paid = peso(booking.paid_downpayment ?? 0);
  return (
    <ConfirmDialog
      open={open}
      title="Cancel this appointment?"
      confirmLabel={outcome === "refund" || outcome === "manual-refund" ? "Cancel & refund" : "Cancel appointment"}
      loadingLabel="Cancelling…"
      cancelLabel="Keep it"
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <p>
        <strong>{clientName || "The client"}</strong>&apos;s {booking.service_name || "booked"} visit on {dateLabel(booking.appointment_date)}, {timeRangeLabel(booking.appointment_time)}, will be cancelled and the slot freed. They&apos;ll be emailed.
      </p>
      <p className="mt-3 font-bold">
        {outcome === "refund" &&
          `It's 72+ hours before the visit, so the ${paid} downpayment is refunded. We try Xendit first; QR Ph payments usually can't be refunded that way, and then the booking is still cancelled and you get a "Refund to send" alert to send the money back yourself.`}
        {outcome === "manual-refund" && `The ${paid} downpayment was paid by payment proof, so it's marked refunded here and you send the money back yourself.`}
        {outcome === "keep" && `It's inside 72 hours, so by the terms the ${paid} downpayment is kept, not refunded.`}
        {outcome === "unpaid" && "Nothing was paid, so there is nothing to refund."}
      </p>
    </ConfirmDialog>
  );
}
