import { Button, Checkbox } from "@/components/atoms";
import { TabSection } from "@/components/molecules";
import { longDateLabel } from "@/lib/timeFormat";
import type { WaitingDay } from "@/services/waitlistService";

interface NotificationsPanelProps {
  waiting: WaitingDay[];
  loading: boolean;
  failed: boolean;
  leaving: boolean;
  onLeave: (id: number) => void;
  /** Null until it loads */
  rebookEmails: boolean | null;
  savingRebook: boolean;
  onRebookEmails: (on: boolean) => void;
}

// The Profile's Reminders tab: the fully booked days the client asked to hear about, and the rebooking emails
export default function NotificationsPanel({ waiting, loading, failed, leaving, onLeave, rebookEmails, savingRebook, onRebookEmails }: NotificationsPanelProps) {
  return (
    <>
      <TabSection title="Days you're waiting for" description="We email you if a time opens up on a fully booked day.">
        {loading ? (
          <p className="text-sm text-gray-red">Loading…</p>
        ) : failed ? (
          <p className="text-sm text-danger-ink">We couldn&apos;t load your waiting list. Please try again later.</p>
        ) : waiting.length === 0 ? (
          <p className="text-sm text-gray-red">You&apos;re not waiting for any day. On a fully booked day, choose &quot;Notify me&quot; when booking.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {waiting.map((day) => (
              <li key={day.id} className="flex items-center justify-between gap-3 rounded-xl border border-crimson-light/60 px-3 py-2">
                <div className="min-w-0 text-sm text-gray-red">
                  <p className="truncate font-bold">{day.service_name}</p>
                  <p>
                    {longDateLabel(day.appointment_date)} · {day.nailist_name ? `with ${day.nailist_name}` : "any available artist"}
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" disabled={leaving} aria-label={`Stop waiting for ${day.service_name} on ${longDateLabel(day.appointment_date)}`} onClick={() => onLeave(day.id)}>
                  Leave
                </Button>
              </li>
            ))}
          </ul>
        )}
      </TabSection>

      <TabSection title="Rebooking emails" description="A reminder some days after a visit to book your next set. Emails about your bookings are always sent.">
        <label className="flex items-center gap-2 text-sm text-gray-red">
          <Checkbox checked={rebookEmails ?? false} disabled={rebookEmails === null || savingRebook} onChange={(e) => onRebookEmails(e.target.checked)} />
          Send me rebooking emails
        </label>
      </TabSection>
    </>
  );
}
