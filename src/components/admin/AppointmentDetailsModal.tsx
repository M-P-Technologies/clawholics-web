import { X as CloseIconLucide } from "lucide-react";
import type {
Appointment,
AppointmentStatus,
} from "../../services/appointmentService";
import Button from "../ui/Button";
import Select from "../ui/Select";
import ClientNotesPanel from "./ClientNotesPanel";
import ProofReviewPanel from "./ProofReviewPanel";


interface AppointmentDetailsModalProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
  // Needed for the proof review and notes panels. Without it the modal is unchanged.
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  onProofReviewed?: () => void;
}

const statusOptions: AppointmentStatus[] = [
  "PENDING",
  "AWAITING_PROOF",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

const AppointmentDetailsModal = ({
  appointment,
  onClose,
  onStatusChange,
  tokenFetcher,
  clerkId,
  onProofReviewed,
}: AppointmentDetailsModalProps) => {
  const customerName =
    `${appointment.first_name ?? ""} ${appointment.last_name ?? ""}`.trim() ||
    `User #${appointment.user_id}`;

  const currentStatus =
    appointment.status?.trim().toUpperCase() as AppointmentStatus;

  const showProofPanel =
    currentStatus === "AWAITING_PROOF" || Boolean(appointment.latest_proof);
  // Walk-in bookings have no real client account, so there is nobody to keep notes on.
  const isWalkin = Boolean(appointment.is_walkin);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 px-4 sm:px-4 py-4 drawer-backdrop max-sm:p-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl bg-milk px-4 py-4 shadow-lg drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="mb-2 flex items-center justify-between gap-4">
          <h3 className="text-[18px] sm:text-[20px] font-bold uppercase text-gray-red">
            Appointment Details
          </h3>

          {/* ICON BUTTON INSTEAD OF TEXT X */}
          <Button variant="bare" onClick={onClose} className="shrink-0">
            <CloseIconLucide size={28} className="sm:h-[30px] sm:w-[30px] text-crimson" aria-hidden="true" />
          </Button>
        </div>

        {/* CONTENT */}
        <div className="flex flex-col gap-4 text-gray-red">
          {/* CLIENT INFO */}
          <Section
            title="Client Information"
            idLabel={`Client ID #${appointment.user_id}`}
          >
            <DetailItem label="Name" value={customerName} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem label="Email" value={appointment.email || "No email"} />
              <DetailItem label="Phone" value={appointment.phone || "No phone"} />
            </div>
          </Section>

          {/* APPOINTMENT DETAILS */}
          <Section
            title="Appointment Details"
            idLabel={`Appointment ID #${appointment.id}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem
                label="Service"
                value={appointment.service_name || "No service"}
              />
              <DetailItem
                label="Nail Artist"
                value={appointment.nailist_name || "No artist"}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem
                label="Date"
                value={appointment.appointment_date || "No date"}
              />
              <DetailItem
                label="Time"
                value={appointment.appointment_time || "No time"}
              />
            </div>

            {/* STATUS */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-crimson-light/15 px-4 py-2">
              <p className="text-[12px] font-bold uppercase text-gray-red">
                Status
              </p>

              <Select className="w-full sm:w-auto"
                  value={currentStatus || "PENDING"}
                  onChange={(e) =>
                    onStatusChange(
                      appointment.id,
                      e.target.value as AppointmentStatus
                    )
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
            </div>
          </Section>

          {/* PAYMENT DETAILS */}
          <Section
            title="Payment Details"
            idLabel={`Payment ID #${appointment.payment_reference || "N/A"}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem
                label="Payment Status"
                value={appointment.payment_status || "No payment status"}
              />
              <DetailItem
                label="Amount"
                value={
                  appointment.payment_amount
                    ? `₱${appointment.payment_amount}`
                    : "No amount"
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem
                label="Payment Method"
                value={appointment.payment_method || "No payment method"}
              />
              <DetailItem
                label="Reference"
                value={appointment.payment_reference || "No reference"}
              />
            </div>
          </Section>

          {tokenFetcher && showProofPanel && (
            <ProofReviewPanel
              appointmentId={appointment.id}
              status={appointment.status}
              proofDueAt={appointment.proof_due_at}
              latestProof={appointment.latest_proof}
              tokenFetcher={tokenFetcher}
              clerkId={clerkId}
              onReviewed={() => onProofReviewed?.()}
            />
          )}

          {tokenFetcher && !isWalkin && appointment.user_id > 0 && (
            <ClientNotesPanel
              clientUserId={appointment.user_id}
              tokenFetcher={tokenFetcher}
              clerkId={clerkId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

function Section({
  title,
  idLabel,
  children,
}: {
  title: string;
  idLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-crimson-light/15 px-4 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-bold uppercase text-gray-red">
          {title}
        </p>

        {idLabel && (
          <span className="text-[11px] font-semibold text-gray-red sm:text-[12px]">
            {idLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-crimson-light/15 px-4 py-2 flex flex-col gap-1">
      <p className="text-[12px] font-bold uppercase text-gray-red">
        {label}
      </p>

      <p className="break-words text-[12px] text-gray-red">
        {value}
      </p>
    </div>
  );
}

export default AppointmentDetailsModal;