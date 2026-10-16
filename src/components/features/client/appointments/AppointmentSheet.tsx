import { Dialog } from "@/components/organisms";
import AppointmentDetails, { type AppointmentDetailsProps } from "@/components/features/client/appointments/AppointmentDetails";
import type { AppointmentView } from "@/types/profile";

interface AppointmentSheetProps extends Omit<AppointmentDetailsProps, "view"> {
  view: AppointmentView | null;
  onClose: () => void;
}

// One appointment (opened from any tab, and below `lg` from the list): a bottom sheet on phones and
// tablets, like Explore's service sheet, and a modal on a computer
export default function AppointmentSheet({ view, onClose, ...details }: AppointmentSheetProps) {
  return (
    <Dialog open={view !== null} title="Appointment" onClose={onClose} placement="sheet">
      {view && <AppointmentDetails view={view} {...details} />}
    </Dialog>
  );
}
