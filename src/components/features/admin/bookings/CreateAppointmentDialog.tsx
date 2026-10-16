"use client";

import { X as CloseIconLucide, Plus as PlusIcon } from "lucide-react";
import { Button, Card } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { SectionHeader, SummaryRow } from "@/components/molecules";
import { useCreateAppointment } from "@/hooks/admin/useCreateAppointment";
import { formatSlot } from "@/lib/admin/createAppointment";
import ClientFields from "./ClientFields";
import DateAndTimeSection from "./DateAndTimeSection";
import ServiceFields from "./ServiceFields";

interface CreateAppointmentDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

// A walk-in or phone booking, laid out like the client's booking page: the form (the client, the
// artist and service, then a free slot) and the summary card beside it (under it on a phone), with
// Cancel and Create in the footer. Close, Escape and the backdrop close it even while it sends;
// only Cancel is locked then.
const CreateAppointmentDialog = ({ onClose, onCreated }: CreateAppointmentDialogProps) => {
  const a = useCreateAppointment({ onCreated });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create appointment"
      size="2xl"
      header={
        <div className="flex items-start justify-between gap-3">
          <SectionHeader size="section" level={3} title="Create appointment" subtitle="A walk-in or phone booking: the client, the artist and service, then a free slot." />
          <Button variant="bare" type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-gray-red hover:bg-crimson-light/30 hover:text-berry">
            <CloseIconLucide size={22} aria-hidden="true" />
          </Button>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={a.submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={a.handleSubmit} loading={a.submitting} loadingText="Creating…">
            <PlusIcon size={14} aria-hidden="true" />
            Create appointment
          </Button>
        </div>
      }
    >
      {a.message && (
        <div role="alert" className="rounded-xl bg-danger/10 px-3 py-3 text-[13px] font-medium text-danger-ink">
          {a.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <ClientFields a={a} />
          <ServiceFields a={a} />
          <DateAndTimeSection a={a} />
        </div>

        {/* What was chosen and the price, as on the booking page's summary card */}
        <Card as="aside" aria-label="Booking summary" className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
          <SectionHeader size="card" title="Summary" />
          <dl className="border-t border-crimson-light/40 pt-2">
            <SummaryRow label="Service" value={a.selectedService?.name || "–"} />
            <SummaryRow label="Artist" value={a.selectedNailist?.name || "–"} />
            <SummaryRow label="Date" value={a.appointmentDate || "–"} />
            <SummaryRow label="Time" value={a.appointmentTime ? formatSlot(a.appointmentTime) : "–"} />
            <SummaryRow label="Price" value={a.selectedPrice ? `₱${a.selectedPrice}` : "–"} strong />
          </dl>
        </Card>
      </div>
    </Dialog>
  );
};

export default CreateAppointmentDialog;
