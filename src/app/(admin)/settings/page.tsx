"use client";

import AdminShell from "@/components/features/admin/shell/AdminShell";
import OffersEditor from "@/components/features/admin/cms/OffersEditor";
import { PanelSection, SaveBar, SelectField, TextField } from "@/components/features/admin/cms/fields";
import { SectionSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { Button } from "@/components/atoms";
import { Tabs } from "@/components/molecules";
import { useSettings } from "@/hooks/admin/useSettings";
import { BIRTHDAY_BANNER_OPTIONS } from "@/lib/admin/homeEditor";
import { POLICY_LIMITS, MAX_ADVANCE_DAYS, MAX_HOLD_MINUTES, MAX_LOYALTY_STAMPS, MAX_NOTICE_HOURS, MAX_REBOOK_NUDGE_DAYS, MIN_ADVANCE_DAYS, MIN_HOLD_MINUTES, MIN_NOTICE_HOURS, MIN_REBOOK_NUDGE_DAYS, PAYMENT_METHOD_CHOICES } from "@/lib/admin/settings";

// Admin > Settings: Payments, Booking, Rewards (the birthday voucher and the loyalty card) and the
// Client app, one tab each but saved together. Its data and actions are in hooks/admin/useSettings.
export default function Settings() {
  const s = useSettings();
  const c = s.clientApp;

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
              <SaveBar dirty={s.dirty} saving={s.isSaving} busy={s.busy} onSave={s.save} onDiscard={s.discard} />

              <Tabs label="Settings" idPrefix="settings" value={s.tab} onChange={s.setTab} tabs={s.tabs} />
              <div role="tabpanel" id={`settings-panel-${s.tab}`} aria-labelledby={`settings-tab-${s.tab}`}>
              {s.tab === "payments" && (
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
              )}

              {s.tab === "booking" && (
              <PanelSection title="Booking" description="When clients can book a time, how long it's held while they pay, and the reminder they get before their visit.">
                <TextField
                  label="Slot hold (minutes)"
                  inputMode="numeric"
                  value={s.form.holdMinutes}
                  onChange={s.setHoldMinutes}
                  hint={`From ${MIN_HOLD_MINUTES} to ${MAX_HOLD_MINUTES}. How long a new booking keeps its time while the client pays; unpaid, it's released for others. Clients pay in their banking app, so 10 to 15 minutes is comfortable. Bookings already made keep their time.`}
                />
                <TextField
                  label="Notice for a booking (hours)"
                  inputMode="numeric"
                  value={s.form.noticeHours}
                  onChange={s.setNoticeHours}
                  hint={`From ${MIN_NOTICE_HOURS} to ${MAX_NOTICE_HOURS}. A time that starts sooner than this isn't offered to clients, so nobody books a slot that begins in minutes. 0 allows booking right up to the start. You can still add a walk-in or move a booking at any time.`}
                />
                <TextField
                  label="How far ahead clients can book (days)"
                  inputMode="numeric"
                  value={s.form.advanceDays}
                  onChange={s.setAdvanceDays}
                  hint={`From ${MIN_ADVANCE_DAYS} to ${MAX_ADVANCE_DAYS}. Days later than this aren't offered on the booking calendar. Bookings already made stay. You can still add a walk-in or move a booking on any day.`}
                />
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-crimson-light/50 p-3">
                  <input type="checkbox" checked={s.form.reminders} onChange={s.toggleReminders} className="mt-0.5 h-4 w-4 shrink-0 accent-crimson" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-gray-red">Email a reminder the day before</span>
                    <span className="text-xs leading-snug text-gray-red">
                      Every morning (9:00, Manila) each client with a confirmed visit tomorrow gets one email. It cuts no-shows, and uses one email per booking from your Resend plan.
                    </span>
                  </span>
                </label>
                <TextField
                  label="Rebooking email (days after a visit)"
                  inputMode="numeric"
                  value={s.form.rebookDays}
                  onChange={s.setRebookDays}
                  hint={`0 turns it off; otherwise ${MIN_REBOOK_NUDGE_DAYS} to ${MAX_REBOOK_NUDGE_DAYS}. A client whose visit finished this many days ago, and who hasn't booked since, gets one email asking if they're ready for their next set. It's a promotional email, so each one has an unsubscribe link, and it uses one email per client from your Resend plan.`}
                />
              </PanelSection>
              )}

              {s.tab === "policies" && (
              <>
              <PanelSection title="Changes and refunds" description="How close to a visit a client can still reschedule it or cancel it for a refund of the downpayment.">
                <TextField
                  label="Change window (hours)"
                  inputMode="numeric"
                  value={s.form.changeWindowHours}
                  onChange={s.setChangeWindowHours}
                  hint={`From ${POLICY_LIMITS.MIN_CHANGE_WINDOW_HOURS} to ${POLICY_LIMITS.MAX_CHANGE_WINDOW_HOURS}. A client can reschedule, or cancel and be refunded, only when the visit is at least this many hours away. Inside it the downpayment is kept, and the pages and emails say so. 72 is three days. An admin can still change anything.`}
                />
              </PanelSection>

              <PanelSection title="Late arrivals" description="The fees for arriving late, which the Complete visit form applies from the time the client came in.">
                <TextField label="First late fee, from (minutes late)" inputMode="numeric" value={s.form.lateFee1Minutes} onChange={s.setLateFee1Minutes} />
                <TextField label="First late fee (₱)" inputMode="numeric" value={s.form.lateFee1Amount} onChange={s.setLateFee1Amount} />
                <TextField label="Second late fee, from (minutes late)" inputMode="numeric" value={s.form.lateFee2Minutes} onChange={s.setLateFee2Minutes} hint="Later than the first." />
                <TextField label="Second late fee (₱)" inputMode="numeric" value={s.form.lateFee2Amount} onChange={s.setLateFee2Amount} hint={`Not lower than the first, up to ${POLICY_LIMITS.MAX_LATE_FEE.toLocaleString("en-PH")}.`} />
                <TextField
                  label="Cancel the visit, from (minutes late)"
                  inputMode="numeric"
                  value={s.form.lateCancelMinutes}
                  onChange={s.setLateCancelMinutes}
                  hint={`Later than the second fee, up to ${POLICY_LIMITS.MAX_LATE_MINUTES}. From here the Complete visit form suggests cancelling, and the downpayment is kept.`}
                />
              </PanelSection>

              <p className="mx-3 mb-6 rounded-xl bg-crimson-light/20 p-3 text-[13px] leading-snug text-gray-red sm:mx-6">
                These numbers are what the system enforces and what the pages and emails quote. Your Terms &amp; Conditions are written by hand, so update them to say the same.
              </p>
              </>
              )}

              {s.tab === "rewards" && (
              <>
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

              {s.tab === "client-app" && (
                c.isLoading ? (
                  <PanelSection title="Client app" description="What signed-in clients see in their app (/my). These don't show on the public site.">
                    <SectionSkeleton label="Loading the client app" lines={4} />
                  </PanelSection>
                ) : c.loadFailed ? (
                  <PanelSection title="Client app" description="What signed-in clients see in their app (/my). These don't show on the public site.">
                    <div className="flex flex-col items-start gap-3">
                      <p className="font-bold text-gray-red">We couldn&apos;t load the client app content.</p>
                      <Button type="button" variant="secondary" onClick={c.retry}>
                        Try again
                      </Button>
                    </div>
                  </PanelSection>
                ) : (
                  <>
                    <PanelSection title="Birthday banner" description="On the client app's Home (/my), not on the public site.">
                      <SelectField label="Show it" value={c.text.home_birthday_enabled} options={BIRTHDAY_BANNER_OPTIONS} onChange={c.setText("home_birthday_enabled")} />
                      <TextField label="Birthday headline" value={c.text.home_birthday_title} onChange={c.setText("home_birthday_title")} />
                      <TextField label="Line under it" value={c.text.home_birthday_line} onChange={c.setText("home_birthday_line")} />
                      <TextField label="Small print" value={c.text.home_birthday_note} onChange={c.setText("home_birthday_note")} />
                      <p className="text-xs text-gray-red">{"{name}"} becomes the client&apos;s first name. Staff apply the treat at the salon.</p>
                    </PanelSection>
                    <PanelSection title="Special offers" description="Banners on the client app's Home (/my), not on the public site.">
                      <OffersEditor offers={c.offers} services={c.services} onChange={c.setOffers} upload={c.upload} uploading={c.uploading} />
                    </PanelSection>
                  </>
                )
              )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
