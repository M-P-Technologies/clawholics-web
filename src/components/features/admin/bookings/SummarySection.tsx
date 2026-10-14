import type { CreateAppointment } from "@/hooks/admin/useCreateAppointment";
import { formatSlot } from "@/lib/admin/createAppointment";

// The create-appointment form's summary: what was chosen and the price
export default function SummarySection({ a }: { a: CreateAppointment }) {
  const { selectedService, selectedNailist, appointmentDate, appointmentTime, selectedPrice } = a;
  return (
    <>
      <h4 className="font-display text-lg font-normal text-gray-red">
        Summary
      </h4>

      <div className="flex flex-col">
        <SummaryRow label="Service" value={selectedService?.name || "–"} />

        <SummaryRow label="Artist" value={selectedNailist?.name || "–"} />

        <SummaryRow label="Date" value={appointmentDate || "–"} />

        <SummaryRow
          label="Time"
          value={appointmentTime ? formatSlot(appointmentTime) : "–"}
        />

        <SummaryRow
          label="Price"
          value={selectedPrice ? `₱${selectedPrice}` : "–"}
          strong
        />
      </div>
    </>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  /** The total: bigger and in the brand colour */
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-dotted border-crimson-light py-2 first:border-t-0 first:pt-0">
      <p className="text-[13px] text-gray-red/70">{label}</p>
      <p className={strong ? "text-right font-display text-xl text-berry" : "text-right text-[13px] font-bold text-gray-red"}>{value}</p>
    </div>
  );
}
