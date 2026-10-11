"use client";

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
  const { photos, instagram, error, reload, nailists, teamContent, loading } = useTeam();

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
                  to={`/artists/${n.id}`}
                  aria-label={`Learn more about ${n.name}`}
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

    </PageShell>
  );
}
