import { ArrowUpRight, X as CloseIconLucide } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { Appointment, AppointmentStatus } from "../../services/appointmentService";
import { Link } from "../../lib/router";
import { Avatar, Button, Select } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import ClientNotesPanel from "./ClientNotesPanel";
import ProofReviewPanel from "./ProofReviewPanel";

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
        <div className="flex shrink-0 items-start gap-3 border-b border-crimson-light/50 px-5 py-4">
          <Avatar name={customerName} size="lg" decorative />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-gray-red/70">Appointment #{appointment.id}</p>
            <h3 id={titleId} className="truncate font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red">
              {customerName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${STATUS_PILL[currentStatus] ?? "bg-sand text-gray-red"}`}>{label(currentStatus)}</span>
              {!isWalkin && appointment.user_id > 0 && (
                <Link to={`/clients/${appointment.user_id}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-berry underline underline-offset-4">
                  Client page
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          <Button variant="bare" data-autofocus aria-label="Close" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-gray-red/70 hover:bg-crimson-light/30 hover:text-berry">
            <CloseIconLucide size={22} aria-hidden="true" />
          </Button>
        </div>
      }
    >
        {/* Body: scrolls on its own */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 text-gray-red">
          <Section title="Client" aside={`Client #${appointment.user_id}`}>
            <Row name="Name" value={customerName} />
            <Row name="Email" value={appointment.email || "No email"} />
            <Row name="Phone" value={appointment.phone || "No phone"} />
          </Section>

          <Section title="Appointment">
            <Row name="Service" value={appointment.service_name || "No service"} />
            <Row name="Nail artist" value={appointment.nailist_name || "No artist"} />
            <Row name="Date" value={dateLabel(appointment.appointment_date) || "No date"} />
            <Row name="Time" value={appointment.appointment_time || "No time"} />
            <div className="flex items-center justify-between gap-4 border-t border-dotted border-crimson-light pt-2.5">
              <p className="text-[13px] text-gray-red/70">Status</p>
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
            </div>
          </Section>

          <Section title="Payment">
            <Row name="Status" value={appointment.payment_status ? label(appointment.payment_status.toUpperCase()) : "No payment status"} />
            <Row name="Amount" value={appointment.payment_amount ? `₱${appointment.payment_amount}` : "No amount"} strong={Boolean(appointment.payment_amount)} />
            <Row name="Method" value={appointment.payment_method || "No payment method"} />
            <Row name="Reference" value={appointment.payment_reference || "No reference"} />
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
    <section aria-label={title} className="flex flex-col gap-2 rounded-xl border border-crimson-light/50 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-display text-lg font-normal text-gray-red">{title}</h4>
        {aside && <span className="text-[12px] text-gray-red/60">{aside}</span>}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

// A label and its value, divided from the row above by a dotted line
function Row({ name, value, strong = false }: { name: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-dotted border-crimson-light py-2 first:border-t-0 first:pt-0">
      <p className="shrink-0 text-[13px] text-gray-red/70">{name}</p>
      <p className={strong ? "min-w-0 break-words text-right font-display text-xl text-berry" : "min-w-0 break-words text-right text-[13px] font-bold"}>{value}</p>
    </div>
  );
}

export default AppointmentDetailsModal;
