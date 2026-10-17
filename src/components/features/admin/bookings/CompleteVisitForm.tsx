import { useId } from "react";
import { Clock } from "lucide-react";
import { Button, Input, Select } from "@/components/atoms";
import { useCompleteVisit } from "@/hooks/admin/useCompleteVisit";
import type { VisitToComplete } from "@/services/completionService";
import VisitPhotoDialog from "@/components/features/admin/bookings/VisitPhotoDialog";

interface CompleteVisitFormProps {
  visit: VisitToComplete;
  /** The artists to choose who did it from */
  artists: { id: number; name: string }[];
  onSaved?: () => void;
  /** Cancels the visit for coming 25+ minutes late (the downpayment is kept). Without it the suggestion has no button. */
  onCancelLate?: () => void;
}

// Completing a visit: when the client came in (a late fee by the salon's terms), the balance paid
// at the salon (prefilled with the menu price less the downpayment, plus that fee, editable), how
// it was paid and who did the nails. Shown locked before the visit's day; once completed it shows
// what was recorded, with Edit, and the visit's photo is added from its own window (optional).
export default function CompleteVisitForm({ visit, artists, onSaved, onCancelLate }: CompleteVisitFormProps) {
  const form = useCompleteVisit(visit, onSaved);
  const id = useId();

  if (form.completed && !form.formOpen) {
    return (
      <div className="mt-1 flex flex-col gap-1.5 text-[13px] text-gray-red">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Paid at the salon: <span className="font-bold">{form.summary || "not recorded"}</span>
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={form.startEditing}>
            Edit
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {form.photosMissing && <p className="text-xs font-bold text-warning-ink">Nail photo still to add, for the artist&apos;s gallery.</p>}
          <button type="button" onClick={form.openPhoto} className="text-xs font-bold text-crimson-ink underline underline-offset-2">
            {form.hasPhoto ? "Change photo" : "Add photo"}
          </button>
        </div>
        <VisitPhotoDialog appointmentId={visit.id} open={form.photoOpen} onClose={form.closePhoto} />
      </div>
    );
  }
  if (!form.formOpen) return null;

  const disabled = form.locked || form.busy;
  return (
    <form
      aria-label="Complete visit"
      className="mt-1 flex flex-col gap-3 rounded-xl border border-crimson-light/60 bg-light-orange/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      {form.locked && (
        <p className="flex items-center gap-3 text-xs font-bold text-gray-red">
          <Clock size={14} aria-hidden="true" className="text-crimson-ink" />
          {form.lockedNote}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-arrived`} className="text-xs font-bold text-gray-red">
            Time they came in
          </label>
          <Input
            id={`${id}-arrived`}
            type="time"
            value={form.arrivedAt}
            onChange={(e) => form.setArrivedAt(e.target.value)}
            disabled={disabled}
            className="h-9 text-[13px]"
          />
          {form.lateLine && <p className="text-xs font-bold text-warning-ink">{form.lateLine}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-balance`} className="text-xs font-bold text-gray-red">
            Balance paid at the salon (₱)
          </label>
          <Input
            id={`${id}-balance`}
            inputMode="numeric"
            value={form.balance}
            onChange={(e) => form.setBalance(e.target.value)}
            disabled={disabled}
            className="h-9 text-[13px]"
          />
          {!form.isAuto && !form.locked && (
            <button type="button" onClick={form.useAuto} className="self-start text-xs font-bold text-crimson-ink underline-offset-2 hover:underline">
              {form.autoLabel}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-red">Paid by</span>
          <Select
            aria-label="Paid by"
            value={form.method}
            onChange={(e) => form.setMethod(e.target.value as typeof form.method)}
            options={form.methods.map((m) => ({ value: m, label: m }))}
            disabled={disabled}
            triggerClassName="h-9! py-0! text-[13px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-red">Done by</span>
          <Select
            aria-label="Done by"
            value={form.artistId}
            onChange={(e) => form.setArtistId(e.target.value)}
            placeholder="Choose the artist"
            options={artists.map((a) => ({ value: String(a.id), label: a.name }))}
            disabled={disabled}
            triggerClassName="h-9! py-0! text-[13px]"
          />
        </div>
      </div>
      {form.lateCancel && !form.completed && (
        <div role="note" className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="text-xs font-bold text-warning-ink">
            25 minutes or more late: the terms cancel this visit and keep the downpayment. You can still serve them and complete it.
          </p>
          {onCancelLate && (
            <Button type="button" size="sm" variant="secondary" onClick={onCancelLate} disabled={form.busy} className="self-start">
              Cancel the visit (late)
            </Button>
          )}
        </div>
      )}
      {form.error && (
        <p role="alert" className="text-xs font-bold text-danger-ink">
          {form.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={disabled}>
          {form.busy ? "Saving…" : form.completed ? "Save changes" : "Complete visit"}
        </Button>
        {form.completed && (
          <Button type="button" size="sm" variant="secondary" onClick={form.cancelEditing} disabled={form.busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
