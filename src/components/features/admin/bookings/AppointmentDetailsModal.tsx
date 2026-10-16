import { ArrowUpRight, X as CloseIconLucide } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { Appointment, AppointmentStatus } from "@/services/appointmentService";
import { Link } from "@/lib/router";
import { Avatar, Button, Select } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { SummaryRow } from "@/components/molecules";
import ClientNotesPanel from "@/components/features/admin/clients/ClientNotesPanel";
import ProofReviewPanel from "@/components/features/admin/bookings/ProofReviewPanel";
import CompleteVisitForm from "@/components/features/admin/bookings/CompleteVisitForm";

interface AppointmentDetailsModalProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
  // Needed for the proof review and notes panels. Without it they are left out.
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  onProofReviewed?: () => void;
  /** The artists, for the Complete visit form. Without them the form is left out. */
  artists?: { id: number; name: string }[];
}

const statusOptions: AppointmentStatus[] = ["PENDING", "AWAITING_PROOF", "AWAITING_CONFIRMATION", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED"];
// Completed is set by completing the visit (its form), so it's only listed while it's the status
const statusChoices = (current: AppointmentStatus) => statusOptions.filter((s) => s !== "COMPLETED" || current === "COMPLETED");

const STATUS_PILL: Record<string, string> = {
  CONFIRMED: "bg-crimson-light/50 text-berry",
  COMPLETED: "bg-success/20 text-gray-red",
  PENDING: "bg-sand text-gray-red",
  AWAITING_PROOF: "bg-sand text-gray-red",
  AWAITING_CONFIRMATION: "bg-warning/15 text-warning-ink",
  CANCELLED: "bg-danger/15 text-gray-red",
  REFUNDED: "bg-danger/15 text-gray-red",
};

const label = (status: string) => status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (ymd?: string) => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${d}, ${y}` : ymd;
};

// One appointment's details, in a modal on a computer and a bottom sheet below `lg` (as in the
// client app): the client, the appointment (with its status), the
// payment, the proof review and the private notes. The Dialog handles focus, Escape and a click outside.
const AppointmentDetailsModal = ({ appointment, onClose, onStatusChange, tokenFetcher, clerkId, onProofReviewed, artists }: AppointmentDetailsModalProps) => {
  const titleId = useId();
  const customerName = `${appointment.first_name ?? ""} ${appointment.last_name ?? ""}`.trim() || `User #${appointment.user_id}`;
  const currentStatus = (appointment.status?.trim().toUpperCase() || "PENDING") as AppointmentStatus;
  const showProofPanel = currentStatus === "AWAITING_PROOF" || Boolean(appointment.latest_proof);
  // Confirming a booking paid online needs the client's screenshot (pending or approved)
  const hasScreenshot = appointment.latest_proof?.status === "PENDING" || appointment.latest_proof?.status === "APPROVED";
  // Walk-in bookings have no real client account, so there is nobody to keep notes on.
  const isWalkin = Boolean(appointment.is_walkin);

  return (
    <Dialog
      open
      onClose={onClose}
      title={customerName}
      placement="sheet"
      size="xl"
      header={
        // The sheet pads it and keeps it above the part that scrolls
        <div className="flex shrink-0 items-start gap-3 border-b border-crimson-light/50 pb-3">
          <Avatar name={customerName} size="lg" decorative />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-red">Appointment #{appointment.id}</p>
            <h3 id={titleId} className="truncate font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red">
              {customerName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${STATUS_PILL[currentStatus] ?? "bg-sand text-gray-red"}`}>{label(currentStatus)}</span>
              {!isWalkin && appointment.user_id > 0 && (
                <Link to={`/clients/${appointment.user_id}`} className="inline-flex items-center gap-1 text-xs font-bold text-berry underline underline-offset-4">
                  Client page
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          <Button variant="bare" data-autofocus aria-label="Close" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-gray-red hover:bg-crimson-light/30 hover:text-berry">
            <CloseIconLucide size={22} aria-hidden="true" />
          </Button>
        </div>
      }
    >
        {/* Body: the sheet scrolls it under the header */}
        <div className="flex flex-col gap-3 text-gray-red">
          <Section title="Client" aside={`Client #${appointment.user_id}`}>
            <SummaryRow label="Name" value={customerName} />
            <SummaryRow label="Email" value={appointment.email || "No email"} />
            <SummaryRow label="Phone" value={appointment.phone || "No phone"} />
          </Section>

          <Section title="Appointment">
            <SummaryRow label="Service" value={appointment.service_name || "No service"} />
            <SummaryRow label="Nail artist" value={appointment.nailist_name || "No artist"} />
            <SummaryRow label="Date" value={dateLabel(appointment.appointment_date) || "No date"} />
            <SummaryRow label="Time" value={appointment.appointment_time || "No time"} />
            <div className="flex items-center justify-between gap-3 border-t border-dotted border-crimson-light pt-3">
              <dt className="text-[13px] text-gray-red">Status</dt>
              <dd>
              <Select
                aria-label="Appointment status"
                className="w-44"
                triggerClassName="h-9! py-0! text-[13px]"
                value={currentStatus}
                onChange={(e) => onStatusChange(appointment.id, e.target.value as AppointmentStatus)}
              >
                {statusChoices(currentStatus).map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </Select>
              </dd>
            </div>
          </Section>

          {/* Paid online: the booking is only confirmed for the client once an admin confirms it */}
          {currentStatus === "AWAITING_CONFIRMATION" && (
            <div role="group" aria-label="Confirm this booking" className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
              <p className="text-sm text-gray-red">
                The client paid the downpayment online. Check their screenshot of the payment, then confirm the booking to let them know it&apos;s set: they get the confirmation email then.
              </p>
              {!hasScreenshot && <p className="text-sm font-bold text-warning-ink">Waiting for the client&apos;s payment screenshot.</p>}
              <Button
                type="button"
                disabled={!hasScreenshot}
                onClick={() => onStatusChange(appointment.id, "CONFIRMED")}
                className="w-full sm:w-auto sm:self-start"
              >
                Confirm booking
              </Button>
            </div>
          )}

          <Section title="Payment">
            <SummaryRow label="Status" value={appointment.payment_status ? label(appointment.payment_status.toUpperCase()) : "No payment status"} />
            <SummaryRow label="Amount" value={appointment.payment_amount ? `₱${appointment.payment_amount}` : "No amount"} strong={Boolean(appointment.payment_amount)} />
            <SummaryRow label="Method" value={appointment.payment_method || "No payment method"} />
            <SummaryRow label="Reference" value={appointment.payment_reference || "No reference"} />
          </Section>

          {/* Completing the visit here too: a walk-in guest has no client page */}
          {artists && (currentStatus === "CONFIRMED" || currentStatus === "COMPLETED") && (
            <Section title="Visit">
              <CompleteVisitForm
                key={`${appointment.id}-${currentStatus}`}
                visit={{
                  id: appointment.id,
                  status: currentStatus,
                  appointment_date: appointment.appointment_date,
                  nailist_id: appointment.nailist_id ?? null,
                  price: appointment.service_price ?? null,
                  paid_downpayment: appointment.paid_downpayment ?? 0,
                  completion: appointment.completion ?? null,
                }}
                artists={artists}
                onSaved={onClose}
              />
            </Section>
          )}

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
            <ClientNotesPanel clientUserId={appointment.user_id} tokenFetcher={tokenFetcher} clerkId={clerkId} />
          )}
        </div>
    </Dialog>
  );
};

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-display text-lg font-normal text-gray-red">{title}</h4>
        {aside && <span className="text-xs text-gray-red">{aside}</span>}
      </div>
      <dl className="flex flex-col">{children}</dl>
    </section>
  );
}


export default AppointmentDetailsModal;
