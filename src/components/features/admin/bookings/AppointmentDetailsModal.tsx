import { ArrowUpRight, X as CloseIconLucide } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { Appointment, AppointmentStatus } from "@/services/appointmentService";
import { Link } from "@/lib/router";
import { Avatar, Button, Select } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { SummaryRow } from "@/components/molecules";
import ClientNotesPanel from "@/components/features/admin/clients/ClientNotesPanel";
import ProofReviewPanel from "@/components/features/admin/bookings/ProofReviewPanel";

interface AppointmentDetailsModalProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
  // Needed for the proof review and notes panels. Without it they are left out.
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  onProofReviewed?: () => void;
}

const statusOptions: AppointmentStatus[] = ["PENDING", "AWAITING_PROOF", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED"];

const STATUS_PILL: Record<string, string> = {
  CONFIRMED: "bg-crimson-light/50 text-berry",
  COMPLETED: "bg-success/20 text-gray-red",
  PENDING: "bg-sand text-gray-red",
  AWAITING_PROOF: "bg-sand text-gray-red",
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

// One appointment's details, in a drawer that slides in from the right: the client, the
// appointment (with its status), the payment, the proof review and the private notes. The
// Dialog handles focus, Escape and a click outside.
const AppointmentDetailsModal = ({ appointment, onClose, onStatusChange, tokenFetcher, clerkId, onProofReviewed }: AppointmentDetailsModalProps) => {
  const titleId = useId();
  const customerName = `${appointment.first_name ?? ""} ${appointment.last_name ?? ""}`.trim() || `User #${appointment.user_id}`;
  const currentStatus = (appointment.status?.trim().toUpperCase() || "PENDING") as AppointmentStatus;
  const showProofPanel = currentStatus === "AWAITING_PROOF" || Boolean(appointment.latest_proof);
  // Walk-in bookings have no real client account, so there is nobody to keep notes on.
  const isWalkin = Boolean(appointment.is_walkin);

  return (
    <Dialog
      open
      onClose={onClose}
      title={customerName}
      placement="drawer"
      header={
        <div className="flex shrink-0 items-start gap-3 border-b border-crimson-light/50 px-6 py-3">
          <Avatar name={customerName} size="lg" decorative />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-gray-red">Appointment #{appointment.id}</p>
            <h3 id={titleId} className="truncate font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red">
              {customerName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-0.5 text-[12px] font-bold ${STATUS_PILL[currentStatus] ?? "bg-sand text-gray-red"}`}>{label(currentStatus)}</span>
              {!isWalkin && appointment.user_id > 0 && (
                <Link to={`/clients/${appointment.user_id}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-berry underline underline-offset-4">
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
        {/* Body: scrolls on its own */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-6 text-gray-red">
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
                triggerClassName="!h-9 !py-0 text-[13px]"
                value={currentStatus}
                onChange={(e) => onStatusChange(appointment.id, e.target.value as AppointmentStatus)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </Select>
              </dd>
            </div>
          </Section>

          <Section title="Payment">
            <SummaryRow label="Status" value={appointment.payment_status ? label(appointment.payment_status.toUpperCase()) : "No payment status"} />
            <SummaryRow label="Amount" value={appointment.payment_amount ? `₱${appointment.payment_amount}` : "No amount"} strong={Boolean(appointment.payment_amount)} />
            <SummaryRow label="Method" value={appointment.payment_method || "No payment method"} />
            <SummaryRow label="Reference" value={appointment.payment_reference || "No reference"} />
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
            <ClientNotesPanel clientUserId={appointment.user_id} tokenFetcher={tokenFetcher} clerkId={clerkId} />
          )}
        </div>
    </Dialog>
  );
};

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 rounded-xl border border-crimson-light/50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-display text-lg font-normal text-gray-red">{title}</h4>
        {aside && <span className="text-[12px] text-gray-red">{aside}</span>}
      </div>
      <dl className="flex flex-col">{children}</dl>
    </section>
  );
}


export default AppointmentDetailsModal;
