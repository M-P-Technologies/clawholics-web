import { useState } from "react";
import { Dialog } from "@/components/organisms";
import { FOOTER_ACTIONS_CLASS } from "@/components/organisms/FooterActions";
import AppointmentDetails, { appointmentHasActions, type AppointmentDetailsProps } from "@/components/features/client/appointments/AppointmentDetails";
import type { AppointmentView } from "@/types/profile";

interface AppointmentSheetProps extends Omit<AppointmentDetailsProps, "view" | "actionsHost"> {
  view: AppointmentView | null;
  onClose: () => void;
}

// One appointment (opened from any tab, and below `lg` from the list): a bottom sheet on phones and
// tablets, like Explore's service sheet, and a modal on a computer. Its actions (pay, reschedule,
// cancel) are in the sheet's sticky footer, on the right.
export default function AppointmentSheet({ view, onClose, ...details }: AppointmentSheetProps) {
  const [footerHost, setFooterHost] = useState<HTMLDivElement | null>(null);
  return (
    <Dialog
      open={view !== null}
      title="Appointment"
      onClose={onClose}
      placement="sheet"
      footer={view && appointmentHasActions(view) ? <div ref={setFooterHost} className={FOOTER_ACTIONS_CLASS} /> : undefined}
    >
      {view && <AppointmentDetails view={view} actionsHost={footerHost} {...details} />}
    </Dialog>
  );
}
