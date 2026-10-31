import { useId } from "react";
import { Clock } from "lucide-react";
import { Button, Input, Select } from "@/components/atoms";
import { FooterActions } from "@/components/organisms";
import { useCompleteVisit } from "@/hooks/admin/useCompleteVisit";
import type { VisitToComplete } from "@/services/completionService";
import VisitPhotoDialog from "@/components/features/admin/bookings/VisitPhotoDialog";
import VisitPhotoDropzone from "@/components/features/admin/bookings/VisitPhotoDropzone";

interface CompleteVisitFormProps {
  visit: VisitToComplete;
  /** The artists to choose who did it from */
  artists: { id: number; name: string }[];
  onSaved?: () => void;
  /** Cancels the visit for coming 25+ minutes late (the downpayment is kept). Without it the suggestion has no button. */
  onCancelLate?: () => void;
  /** In a dialog (CompleteVisitDialog): the form is always open, and its Cancel closes the dialog */
  onCancel?: () => void;
  /** Once completed, Edit calls this (e.g. to open the dialog) instead of opening the form in place */
  onEdit?: () => void;
  /** In a dialog: the element of its footer, where the Save and Cancel buttons are drawn (`null` while it mounts) */
  actionsHost?: HTMLElement | null;
}

// Completing a visit: when the client came in (a late fee by the salon's terms), the balance paid
// at the salon (prefilled with the menu price less the downpayment, plus that fee, editable), how
// it was paid and who did the nails, and the nail photo (optional: dropped here, or added later from
// its own window). Shown locked before the visit's day; once completed it shows what was recorded,
// with Edit.
export default function CompleteVisitForm({ visit, artists, onSaved, onCancelLate, onCancel, onEdit, actionsHost }: CompleteVisitFormProps) {
  const form = useCompleteVisit(visit, onSaved);
  const id = useId();
  const inDialog = Boolean(onCancel);

  if (form.completed && !form.formOpen && !inDialog) {
    return (
      <div className="mt-1 flex flex-col gap-1.5 text-[13px] text-gray-red">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Paid at the salon: <span className="font-bold">{form.summary || "not recorded"}</span>
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={onEdit ?? form.startEditing}>
            Edit
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {form.photosMissing && <p className="text-xs font-bold text-warning-ink">Photo still to add, for the artist&apos;s gallery.</p>}
          <button type="button" onClick={form.openPhoto} className="text-xs font-bold text-crimson-ink underline underline-offset-2">
            {form.hasPhoto ? "Change photo" : "Add photo"}
          </button>
        </div>
        <VisitPhotoDialog appointmentId={visit.id} open={form.photoOpen} onClose={form.closePhoto} label={visit.label} />
      </div>
    );
  }
  if (!form.formOpen && !inDialog) return null;

  const disabled = form.locked || form.busy;
  return (
    <form
      id={`${id}-form`}
      aria-label="Complete visit"
      className={inDialog ? "flex flex-col gap-3" : "mt-1 flex flex-col gap-3 rounded-xl border border-crimson-light/60 bg-light-orange/40 p-3"}
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      {form.locked && (
        <p className="flex items-center gap-3 text-xs font-bold text-gray-red">
          <Clock size={16} aria-hidden="true" className="text-crimson-ink" />
          {form.lockedNote}
        </p>
      )}
      {/* One field per row in the dialog; two columns inline */}
      <div className={inDialog ? "flex flex-col gap-3" : "grid gap-3 sm:grid-cols-2"}>
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
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={`${id}-voucher`} className="text-xs font-bold text-gray-red">
            Voucher (optional)
          </label>
          {form.voucherApplied ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-bold text-success-ink">{form.voucherLine}</p>
              <button type="button" onClick={form.removeVoucher} disabled={disabled} className="text-xs font-bold text-crimson-ink underline underline-offset-2">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Input
                id={`${id}-voucher`}
                value={form.voucherInput}
                onChange={(e) => form.setVoucherInput(e.target.value)}
                placeholder="e.g. K7MX4QPA"
                autoComplete="off"
                disabled={disabled}
                className="h-9 font-mono text-[13px] uppercase"
              />
              <Button type="button" size="sm" variant="secondary" onClick={() => void form.applyVoucher()} disabled={disabled || form.checkingVoucher} className="shrink-0">
                {form.checkingVoucher ? "Checking…" : "Apply"}
              </Button>
            </div>
          )}
          {form.voucherError && (
            <p role="alert" className="text-xs font-bold text-danger-ink">
              {form.voucherError}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-gray-red">Photo (optional)</span>
        <VisitPhotoDropzone
          id={`${id}-photo`}
          file={form.photo.file}
          preview={form.photo.preview}
          error={form.photo.error}
          maxMb={form.photo.maxMb}
          disabled={disabled}
          onChoose={form.photo.choose}
        />
        <p className="text-xs text-gray-red">
          {form.hasPhoto ? "A new photo replaces the visit's current one. " : ""}It goes first in the artist&apos;s gallery. You can also add it later.
        </p>
      </div>
      {/* How the suggested balance is worked out, the late fee from the time they came in */}
      <dl aria-label="Balance breakdown" className="flex flex-col gap-1 rounded-lg bg-milk/70 p-3 text-xs text-gray-red">
        {form.breakdown.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt>{row.label}</dt>
            <dd className="font-bold">{row.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-crimson-light/60 pt-1">
          <dt className="font-bold">Balance to pay</dt>
          <dd className="font-bold">{form.suggested}</dd>
        </div>
      </dl>
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
      <FooterActions host={actionsHost}>
        {(form.completed || inDialog) && (
          <Button type="button" size="sm" variant="secondary" onClick={onCancel ?? form.cancelEditing} disabled={form.busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" form={`${id}-form`} size="sm" disabled={disabled}>
          {form.busy ? "Saving…" : form.completed ? "Save changes" : "Complete visit"}
        </Button>
      </FooterActions>
    </form>
  );
}
