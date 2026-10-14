"use client";

import { ArrowLeft, CalendarCheck, Stamp, Wallet } from "lucide-react";
import clsx from "clsx";
import AdminShell from "../../components/admin/AdminShell";
import BookingTracker from "../../components/admin/client/BookingTracker";
import ClientAppointments from "../../components/admin/client/ClientAppointments";
import ClientProfilePanel from "../../components/admin/client/ClientProfilePanel";
import StatCard from "../../components/ui/StatCard";
import NoteItem from "../../components/admin/client/NoteItem";
import TabSection from "../../components/ui/TabSection";
import Button from "../../components/ui/Button";
import StatePanel from "../../components/ui/StatePanel";
import { useClientPage } from "../../hooks/admin/useClientPage";
import { CLIENT_TABS, clientName, dateLabel, noteFieldClass } from "../../lib/admin/clientPage";
import { peso } from "../../lib/dashboardFormat";
import { Link } from "../../lib/router";
import { ClientPageSkeleton } from "../../components/admin/skeletons";

// One client's page (admin only): who they are on the left, and on the right three tabs: an
// overview (counts and where their booking is), the notes and next steps, and every appointment
// with its review and notes. Its data and actions are in hooks/admin/useClientPage.
export default function ClientPage() {
  const page = useClientPage();
  const { details, notes, tab } = page;

  const back = (
    <Link to="/clients" className="flex items-center gap-1.5 text-sm font-bold text-berry underline decoration-crimson-light underline-offset-4">
      <ArrowLeft size={16} aria-hidden="true" />
      Back to clients
    </Link>
  );

  if (page.notFound || page.failed) {
    return (
      <AdminShell title="Client">
        <StatePanel
          kind="error"
          title={page.notFound ? "We couldn't find this client" : "We couldn't load this client"}
          message={page.notFound ? "They may have been removed, or this is a walk-in booked without an account." : "Please check your connection and try again."}
        >
          {back}
        </StatePanel>
      </AdminShell>
    );
  }

  if (!details) return <ClientPageSkeleton />;

  const { summary, appointments } = details;
  const name = clientName(details.client);

  return (
    <AdminShell title={name} actions={back}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-2">
        {/* Two panels, each 80vh tall on a computer: they scroll inside, the tab bar stays put */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ClientProfilePanel name={name} details={details} nextAppointment={page.nextAppointment} />

          <section aria-label="Client details" className="flex min-w-0 flex-col overflow-clip rounded-2xl border border-crimson-light/40 bg-milk shadow-petal lg:h-[80vh]">
            <div role="tablist" aria-label="Client sections" className="flex shrink-0 overflow-x-auto overflow-y-hidden border-b border-crimson-light/50 px-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {CLIENT_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  id={`client-tab-${t.value}`}
                  aria-selected={tab === t.value}
                  aria-controls={`client-panel-${t.value}`}
                  onClick={() => page.setTab(t.value)}
                  className={clsx(
                    "shrink-0 whitespace-nowrap border-b-2 px-4 py-3.5 text-[14px] font-bold transition-colors",
                    tab === t.value ? "border-crimson text-berry" : "border-transparent text-gray-red/70 hover:text-berry",
                  )}
                >
                  {t.label}
                  {t.value === "notes" && notes.length > 0 && <span className="ml-1.5 rounded-full bg-crimson-light/50 px-1.5 text-[11px] text-berry">{notes.length}</span>}
                  {t.value === "appointments" && <span className="ml-1.5 rounded-full bg-crimson-light/50 px-1.5 text-[11px] text-berry">{appointments.length}</span>}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`client-panel-${tab}`} aria-labelledby={`client-tab-${tab}`} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
              {tab === "overview" && (
                <>
                  <TabSection title="At a glance" description="Their visits, what they've spent and their loyalty card.">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <StatCard icon={CalendarCheck} label="Visits" value={String(summary.visits)} hint="completed" />
                      <StatCard icon={Wallet} label="Total spent" value={peso(summary.totalSpent)} hint="list price of visits" />
                      <StatCard icon={Stamp} label="Loyalty stamps" value={`${Math.min(summary.stamps, page.stampTarget)} / ${page.stampTarget}`} />
                    </div>
                  </TabSection>
                  <TabSection title="Booking tracker" description="Where a booking is, from booking to the finished visit. It follows their current booking; pick another to see it.">
                    <BookingTracker appointments={appointments} today={page.today} />
                  </TabSection>
                </>
              )}

              {tab === "notes" && (
                <>
                  <TabSection title="Notes" description="Allergies, preferences, anything to remember. Only admins see these.">
                    <div className="flex flex-col gap-2">
                      <label className="sr-only" htmlFor="new-client-note">
                        New note
                      </label>
                      <textarea
                        id="new-client-note"
                        aria-label="New note"
                        rows={3}
                        value={page.draft}
                        onChange={(e) => page.setDraft(e.target.value)}
                        placeholder="Allergies, preferences, anything to remember…"
                        className={noteFieldClass}
                      />
                      <Button type="button" loading={page.busy} disabled={!page.draft.trim()} onClick={page.addGeneralNote} className="self-end">
                        Add note
                      </Button>
                    </div>
                    {notes.length === 0 ? (
                      <p className="text-sm text-gray-red/70">No notes yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {page.generalNotes.map((n) => (
                          <NoteItem key={n.id} note={n} onDelete={() => page.removeNote(n.id)} />
                        ))}
                        {page.visitNotes.map((n) => {
                          const visit = page.visitOf(n.appointment_id);
                          return (
                            <NoteItem
                              key={n.id}
                              note={n}
                              about={visit ? `About the ${dateLabel(visit.appointment_date)} visit (${visit.service_name})` : "About a visit"}
                              onDelete={() => page.removeNote(n.id)}
                            />
                          );
                        })}
                      </ul>
                    )}
                  </TabSection>
                  <TabSection title="Next steps" description="What to do next for this client.">
                    <textarea
                      aria-label="Next steps"
                      rows={5}
                      value={page.steps}
                      onChange={(e) => page.setSteps(e.target.value)}
                      placeholder="What to do next for this client"
                      className={noteFieldClass}
                    />
                    <Button type="button" variant="secondary" loading={page.busy} onClick={page.saveSteps} className="self-end">
                      Save
                    </Button>
                  </TabSection>
                </>
              )}

              {tab === "appointments" && (
                <TabSection title="Appointments" description="Every booking, newest first, with the client's review. Approve a review to show it on the home page. Add a note to any visit.">
                  <ClientAppointments
                    appointments={appointments}
                    notesFor={page.notesFor}
                    draft={page.visitDraft}
                    busy={page.busy}
                    onDraft={page.setVisitDraft}
                    onSaveNote={page.addVisitNote}
                    onDeleteNote={page.removeNote}
                    onApproveReview={page.approveReview}
                  />
                </TabSection>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
