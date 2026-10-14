"use client";

import { X as CloseIconLucide, Plus as PlusIcon } from "lucide-react";
import { Button } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { useCreateAppointment } from "@/hooks/admin/useCreateAppointment";
import ClientFields from "./ClientFields";
import DateAndTimeSection from "./DateAndTimeSection";
import ServiceFields from "./ServiceFields";
import SummarySection from "./SummarySection";

interface CreateAppointmentDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

// A walk-in or phone booking, as one form: the client, the artist and service, a free slot and the
// summary. Close, Escape and the backdrop close it even while it sends; only Cancel is locked then.
const CreateAppointmentDialog = ({ onClose, onCreated }: CreateAppointmentDialogProps) => {
  const a = useCreateAppointment({ onCreated });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create appointment"
      size="xl"
      header={
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red sm:text-3xl">
              Create appointment
            </h3>
            <p className="text-[13px] text-gray-red/70">A walk-in or phone booking: the client, the artist and service, then a free slot.</p>
          </div>

          <Button variant="bare" type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-gray-red/70 hover:bg-crimson-light/30 hover:text-berry">
            <CloseIconLucide size={22} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <div>
        {a.message && (
          <div role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-medium text-danger">
            {a.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.50fr_0.50fr] lg:gap-4">
          {/* LEFT SIDE */}
          <div className="flex flex-col gap-4">
            <ClientFields a={a} />

            <ServiceFields a={a} />

            {/* DATE AND TIME - MOBILE POSITION */}
            <section className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-4 lg:hidden">
              <DateAndTimeSection a={a} />
            </section>

            {/* BOOKING SUMMARY */}
            <section className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-4 text-gray-red">
              <SummarySection a={a} />
            </section>
          </div>

          {/* RIGHT SIDE DESKTOP */}
          <div className="hidden flex-col gap-4 lg:flex">
            {/* DATE AND TIME */}
            <section className="flex flex-col gap-3 rounded-xl border border-crimson-light/50 p-4">
              <DateAndTimeSection a={a} />
            </section>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-crimson-light/50 pt-4">
          <Button variant="secondary" type="button" onClick={onClose} disabled={a.submitting}>
            Cancel
          </Button>

          <Button type="button" onClick={a.handleSubmit} loading={a.submitting} loadingText="Creating…">
            <PlusIcon size={14} aria-hidden="true" />
            Create appointment
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default CreateAppointmentDialog;
