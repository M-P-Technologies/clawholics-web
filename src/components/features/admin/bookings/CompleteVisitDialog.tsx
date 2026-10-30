import { useState } from "react";
import { Dialog } from "@/components/organisms";
import { FOOTER_ACTIONS_CLASS } from "@/components/organisms/FooterActions";
import type { VisitToComplete } from "@/services/completionService";
import CompleteVisitForm from "@/components/features/admin/bookings/CompleteVisitForm";

interface CompleteVisitDialogProps {
  open: boolean;
  onClose: () => void;
  visit: VisitToComplete;
  /** The artists to choose who did it from */
  artists: { id: number; name: string }[];
  /** Cancels the visit for coming 25+ minutes late (the downpayment is kept) */
  onCancelLate?: () => void;
}

// The Complete visit form in a dialog (the client page's booking tracker): saving or cancelling closes it.
// Its buttons are drawn in the dialog's sticky footer, on the right.
export default function CompleteVisitDialog({ open, onClose, visit, artists, onCancelLate }: CompleteVisitDialogProps) {
  const [footerHost, setFooterHost] = useState<HTMLDivElement | null>(null);
  const completed = visit.status.trim().toUpperCase() === "COMPLETED";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={completed ? "Edit the completed visit" : "Complete visit"}
      placement="sheet"
      size="lg"
      footer={<div ref={setFooterHost} className={FOOTER_ACTIONS_CLASS} />}
    >
      {/* Mounted only while open, so it starts from the visit's saved record each time */}
      {open && (
        <CompleteVisitForm
          visit={visit}
          artists={artists}
          actionsHost={footerHost}
          onSaved={onClose}
          onCancel={onClose}
          onCancelLate={
            onCancelLate &&
            (() => {
              onClose();
              onCancelLate();
            })
          }
        />
      )}
    </Dialog>
  );
}
