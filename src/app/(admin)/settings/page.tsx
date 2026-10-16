"use client";

import AdminShell from "@/components/features/admin/shell/AdminShell";
import { PanelSection, SaveBar, TextField } from "@/components/features/admin/cms/fields";
import { SectionSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { Button } from "@/components/atoms";
import { useSettings } from "@/hooks/admin/useSettings";
import { MAX_LOYALTY_STAMPS, PAYMENT_METHOD_CHOICES } from "@/lib/admin/settings";

// Admin > Settings: the online downpayment, the ways to pay it, the birthday voucher's discount
// and the loyalty card's stamps, saved together. Its data and actions are in hooks/admin/useSettings.
export default function Settings() {
  const s = useSettings();

  return (
    <AdminShell title="Settings">
      <div className="flex-1 overflow-y-auto pb-2">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-crimson-light/40 bg-milk shadow-petal">
          {s.isLoading ? (
            <SectionSkeleton label="Loading settings" lines={6} className="p-6" />
          ) : s.loadFailed ? (
            <div className="flex flex-col items-start gap-3 p-6">
              <p className="font-bold text-gray-red">We couldn&apos;t load the settings.</p>
              <Button type="button" variant="secondary" onClick={s.retry}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <SaveBar dirty={s.dirty} saving={s.isSaving} onSave={s.save} onDiscard={s.discard} />

              <PanelSection title="Payments" description="What clients pay when they book, to hold their slot. The rest of the service price is paid at the salon.">
                <TextField
                  label="Downpayment (₱)"
                  inputMode="numeric"
                  value={s.form.downpayment}
                  onChange={s.setDownpayment}
                  hint="A whole number of pesos. Bookings already paid keep the amount they paid."
                />
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-1.5 text-[13px] font-medium text-gray-red">Ways to pay the downpayment</legend>
                  {PAYMENT_METHOD_CHOICES.map((choice) => (
                    <label key={choice.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-crimson-light/50 p-3">
                      <input
                        type="checkbox"
                        checked={s.form.methods.includes(choice.value)}
                        onChange={() => s.toggleMethod(choice.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-crimson"
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-red">{choice.label}</span>
                        <span className="text-xs leading-snug text-gray-red">{choice.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </PanelSection>

              <PanelSection title="Birthday voucher" description="Each client gets a voucher in their birthday month, emailed at the start of the month, for money off a service paid at the salon.">
                <TextField
                  label="Discount (%)"
                  inputMode="numeric"
                  value={s.form.birthdayPct}
                  onChange={s.setBirthdayPct}
                  hint="From 1 to 100. Applies to vouchers issued from now on; ones already sent keep their discount."
                />
              </PanelSection>

              <PanelSection title="Loyalty card" description="Clients earn a stamp each visit, when an admin scans their QR code. A full card earns a reward, and redeeming it starts a new card.">
                <TextField
                  label="Stamps for a reward"
                  inputMode="numeric"
                  value={s.form.stampsRequired}
                  onChange={s.setStampsRequired}
                  hint={`From 1 to ${MAX_LOYALTY_STAMPS}. Changes every card at once: clients who already have this many stamps can redeem straight away.`}
                />
              </PanelSection>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
