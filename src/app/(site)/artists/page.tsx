"use client";

import PhotoRow from "@/components/home/PhotoRow";
import ImageCard from "@/components/home/ImageCard";
import { Button, LoadingBar } from "@/components/atoms";
import { LoadError, SectionHeader, Pagination, EmptyState } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import { artistPath } from "@/utils/slug";
import { useTeam } from "@/hooks/useTeam";

export default function Team() {
  const { photos, instagram, error, reload, nailists, words, loading, page, totalPages, pageItems, listRef, goToPage } = useTeam();

  if (error && !words) return <LoadError what="artists" onRetry={reload} />;
  if (loading || !words) return <LoadingBar label="Loading our artists" />;

  return (
    <PageShell>
      <Section>
        <SectionHeader title={words.team_title} subtitle={words.team_description} />

        {nailists.length === 0 && (
          <EmptyState
            kind="empty"
            title="Our artists are being added"
            message="No artist profiles are published yet. Please check back soon, or contact us and we will gladly tell you who will take care of you."
          />
        )}

        <div ref={listRef} className="flex scroll-mt-24 flex-col gap-3 md:gap-9">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-9">
          {pageItems.map((n, index) => (
            <ImageCard
              key={n.id}
              priority={index === 0}
              image={n.image}
              imageAlt={`${n.name}, ${n.position} at Clawholics by Max`}
              aspect="aspect-3/4"
              title={n.name}
              titleId={`nailist-${n.id}`}
              subtitle={n.position}
              description={n.bio}
              mobileLines={3}
              footer={
                <Button to={artistPath(n)} className="w-fit">
                  Learn more<span className="sr-only"> about {n.name}</span>
                </Button>
              }
            />
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </div>

        <PhotoRow title={words.team_art_title} photos={photos} instagram={instagram} />
      </Section>

    </PageShell>
  );
}
