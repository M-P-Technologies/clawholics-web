"use client";

import { ArrowLeft, CalendarCheck, Stamp, Wallet } from "lucide-react";
import AdminShell from "@/components/features/admin/shell/AdminShell";
import BookingTracker from "@/components/features/admin/clients/BookingTracker";
import ClientAppointments from "@/components/features/admin/clients/ClientAppointments";
import NoteItem from "@/components/features/admin/clients/NoteItem";
import { StatCard, TabSection, Tabs, EmptyState } from "@/components/molecules";
import { Badge, Button } from "@/components/atoms";
import { ProfilePanel } from "@/components/organisms";
import { ClientPageSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { useClientPage } from "@/hooks/admin/useClientPage";
import { noteFieldClass } from "@/lib/admin/clientPage";
import { peso } from "@/lib/dashboardFormat";
import { Link } from "@/lib/router";

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
        <EmptyState
          kind="error"
          title={page.notFound ? "We couldn't find this client" : "We couldn't load this client"}
          message={page.notFound ? "They may have been removed, or this is a walk-in booked without an account." : "Please check your connection and try again."}
        >
          {back}
        </EmptyState>
      </AdminShell>
    );
  }

  if (!details) return <ClientPageSkeleton />;

  // A round icon before the title, like the settings and bell buttons (the client's name is in their profile panel)
  const backButton = (
    <Link
      to="/clients"
      aria-label="Back to clients"
      title="Back to clients"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-crimson-light text-berry transition-colors hover:bg-crimson-light/30 focus-visible:outline-2 focus-visible:outline-crimson"
    >
      <ArrowLeft size={17} aria-hidden="true" />
    </Link>
  );

  const { summary, appointments } = details;

  return (
    <AdminShell title="Client" hideTitle leading={backButton}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-2">
        {/* Two panels, as in the client's My profile: the profile (1/3) and the tabs (2/3), each 80vh
            tall on a computer: they scroll inside, the tab bar stays put */}
        <div className="grid grid-cols-1 items-start gap-3 md:gap-6 lg:grid-cols-3">
          <ProfilePanel
            label="Client profile"
            className="lg:h-[80vh] lg:overflow-y-auto"
            name={page.name}
            badges={
              <>
                <Badge tone="brand">Client</Badge>
                <Badge>{page.stampsLabel}</Badge>
              </>
            }
            highlight={page.highlight}
            rowsTitle="Client info"
            rows={page.panelRows}
          />

          <section aria-label="Client details" className="flex min-w-0 flex-col overflow-clip rounded-2xl border border-crimson-light/40 bg-milk shadow-petal lg:col-span-2 lg:h-[80vh]">
            <Tabs
              label="Client sections"
              idPrefix="client"
              value={tab}
              onChange={page.setTab}
              tabs={page.tabs}
            />

            <div role="tabpanel" id={`client-panel-${tab}`} aria-labelledby={`client-tab-${tab}`} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
              {tab === "overview" && (
                <>
                  <TabSection title="At a glance" description="Their visits, what they've spent and their loyalty card.">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <StatCard size="compact" icon={CalendarCheck} label="Visits" value={String(summary.visits)} hint="completed" />
                      <StatCard size="compact" icon={Wallet} label="Total spent" value={peso(summary.totalSpent)} hint="list price of visits" />
                      <StatCard size="compact" icon={Stamp} label="Loyalty stamps" value={page.stampsValue} className="col-span-2 sm:col-span-1" />
                    </div>
                  </TabSection>
                  <TabSection title="Booking tracker" description="Where a booking is, from booking to the finished visit. It follows their current booking; pick another to see it.">
                    <BookingTracker appointments={appointments} today={page.today} artists={page.artists} onNoShow={page.markNoShow} onCancelLate={page.cancelLate} />
                  </TabSection>
                </>
              )}

              {tab === "notes" && (
                <>
                  <TabSection title="Notes" description="Allergies, preferences, anything to remember. Only admins see these.">
                    <div className="flex flex-col gap-3">
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
                      <p className="text-sm text-gray-red">No notes yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {page.generalNotes.map((n) => (
                          <NoteItem key={n.id} note={n} onDelete={() => page.removeNote(n.id)} />
                        ))}
                        {page.visitNotes.map(({ note, about }) => (
                          <NoteItem key={note.id} note={note} about={about} onDelete={() => page.removeNote(note.id)} />
                        ))}
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
