import { SummaryRow } from "@/components/molecules";
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

      <dl className="flex flex-col">
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
      </dl>
    </>
  );
}
