import type {
Appointment,
AppointmentStatus,
} from "../../services/appointmentService";
import { getProofState,isProofOverdue } from "../../services/proofState";
import Select from "../ui/Select";


interface AppointmentRowProps {
  appointment: Appointment;
  onClick: () => void;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
}

const statusOptions: AppointmentStatus[] = [
  "PENDING",
  "AWAITING_PROOF",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

// Dot beside each status, so the colour says what it means before you read it
const statusDotClass = (status: AppointmentStatus) => {
  switch (status) {
    case "PENDING":
    case "AWAITING_PROOF":
      return "bg-warning";
    case "CONFIRMED":
      return "bg-info";
    case "COMPLETED":
      return "bg-success";
    case "CANCELLED":
      return "bg-danger";
    case "REFUNDED":
      return "bg-crimson-light";
    default:
      return "bg-gray-red/50";
  }
};

const AppointmentRow = ({
  appointment,
  onClick,
  onStatusChange,
}: AppointmentRowProps) => {
  const customerName =
    `${appointment.first_name ?? ""} ${appointment.last_name ?? ""}`.trim() ||
    `User #${appointment.user_id}`;

  const currentStatus =
    appointment.status?.trim().toUpperCase() as AppointmentStatus;
  const now = Date.now();
  const proofKind = isProofOverdue(appointment, now) ? "overdue" : getProofState(appointment, now).kind;

  return (
    <div
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk px-4 py-4 shadow-petal lg:flex-row lg:items-center lg:justify-between lg:gap-0 lg:py-4 lg:pr-4 lg:pl-4 hover:bg-light-orange/50 transition-all duration-300 hover:shadow-md"
    >
      <div className="min-w-0 pl-2 lg:pl-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[18px] uppercase font-bold text-gray-red">
            {customerName}
          </p>

          <span className="rounded-md border-[0.8px] px-2 py-0.5 text-[11px] font-bold text-gray-red">
            ID #{appointment.id}
          </span>

          {proofKind === "overdue" && (
            <span className="rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
              Proof overdue
            </span>
          )}
          {proofKind === "in_review" && (
            <span className="rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
              Proof to review
            </span>
          )}
        </div>

        <p className="text-[14px] font-medium text-gray-red truncate">
          {appointment.service_name || "No service"} &nbsp;•&nbsp;
          {appointment.appointment_date || "No date"} |{" "}
          {appointment.appointment_time || "No time"}
          &nbsp;•&nbsp; {appointment.nailist_name || "No artist"}
        </p>
      </div>

      {/* CUSTOM DROPDOWN */}
      <div
        className="relative w-full lg:w-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          className="w-full lg:w-auto"
          aria-label="Appointment status"
          value={currentStatus || "PENDING"}
          onChange={(e) => onStatusChange(appointment.id, e.target.value as AppointmentStatus)}
          options={statusOptions.map((status) => ({
            value: status,
            label: status.replace(/_/g, " "),
            leading: <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`} />,
          }))}
        />
      </div>
    </div>
  );
};

export default AppointmentRow;