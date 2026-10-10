"use client";

import { X } from "lucide-react";
import PhotoRow from "../../components/home/PhotoRow";
import ImageCard from "../../components/home/ImageCard";
import Button from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import LoadError from "../../components/ui/LoadError";
import PageHeader from "../../components/layout/PageHeader";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import StatePanel from "../../components/ui/StatePanel";
import { useTeam } from "../../hooks/useTeam";

export default function Team() {
  const { photos, instagram, error, reload, nailists, teamContent, selected, setSelected, loading, closeNailist } = useTeam();

  if (error && !teamContent) return <LoadError what="artists" onRetry={reload} />;
  if (loading || !teamContent) return <LoadingBar label="Loading our artists" />;

  return (
    <PageShell>
      <Section>
        <PageHeader title="Meet our artists" subtitle={teamContent.team_description} />

        {nailists.length === 0 && (
          <StatePanel
            kind="empty"
            title="Our artists are being added"
            message="No artist profiles are published yet. Please check back soon, or contact us and we will gladly tell you who will take care of you."
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {nailists.map((n) => (
            <ImageCard
              key={n.id}
              image={n.image}
              imageAlt={`${n.name}, ${n.position} at Clawholics by Max`}
              aspect="aspect-3/4"
              title={n.name}
              titleId={`nailist-${n.id}`}
              subtitle={n.position}
              description={n.bio}
              mobileLines={3}
              footer={
                <Button
                  variant="secondary"
                  type="button"
                  aria-label={`Learn more about ${n.name}`}
                  onClick={() => setSelected(n)}
                  className="w-fit"
                >
                  Learn more
                </Button>
              }
            />
          ))}
        </div>

        <PhotoRow title="Their art" photos={photos} instagram={instagram} />
      </Section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm drawer-backdrop max-sm:p-0"
          onClick={closeNailist}
          role="dialog"
          aria-modal="true"
          aria-labelledby="nailist-modal-title"
        >
          <div
            className="relative flex max-h-[90vh] w-[90%] max-w-3xl flex-col overflow-y-auto overflow-x-hidden rounded-sm border border-crimson-light bg-light-orange shadow-2xl shadow-crimson/20 md:flex-row drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="bare"
              type="button"
              aria-label="Close nail artist details modal"
              onClick={closeNailist}
              className="absolute right-4 top-4 z-20 rounded-md bg-light-orange/80 p-1.5 text-gray-red transition-colors hover:text-crimson focus-visible:outline-2 focus-visible:outline-crimson"
            >
              <X size={20} aria-hidden="true" />
            </Button>

            <div className="h-96 bg-sand/50 md:h-auto md:w-1/2">
              <img
                loading="lazy"
                src={selected.image}
                alt={`${selected.name}, ${selected.position}`}
                className="h-full w-full object-cover object-top"
              />
            </div>

            <div className="flex flex-col gap-4 p-4 md:w-1/2 md:gap-8 md:p-8">
              <div className="flex flex-col gap-1">
                <h2
                  id="nailist-modal-title"
                  className="font-display text-3xl font-normal not-italic uppercase tracking-widest text-gray-red md:text-4xl"
                >
                  {selected.name}
                </h2>
                <p className="text-sm font-bold text-crimson md:text-base">{selected.position}</p>
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-red/80 md:text-base">
                {selected.bio}
              </p>

              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg uppercase tracking-widest text-gray-red">
                  Specialties
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-red/80 md:text-base">
                  {selected.specialty}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-display text-lg uppercase tracking-widest text-gray-red">
                  Offered services
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selected.offered_services?.map((service: string) => (
                    <span
                      key={service}
                      className="rounded-md border border-crimson-light px-4 py-1 text-sm text-crimson md:text-sm"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
