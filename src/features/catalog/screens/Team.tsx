"use client";

import { useRef } from "react";
import PhotoRow from "../../content/components/PhotoRow";
import ImageCard from "../../content/components/ImageCard";
import Button from "../../../components/ui/Button";
import { LoadingBar } from "../../../components/ui/LoadingBar";
import LoadError from "../../../components/ui/LoadError";
import PageHeader from "../../../components/layout/PageHeader";
import PageShell from "../../../components/layout/PageShell";
import Section from "../../../components/layout/Section";
import Pagination from "../../../components/ui/Pagination";
import StatePanel from "../../../components/ui/StatePanel";
import { usePagination } from "../../../hooks/usePagination";
import { artistPath } from "../../../lib/slug";
import { useTeam } from "../hooks/useTeam";
import { readTeamPage } from "../../content/lib/homeSections";

export default function Team() {
  const { photos, instagram, error, reload, nailists, teamContent, loading } = useTeam();
  // 9 artists a page
  const { page, setPage, totalPages, pageItems } = usePagination(nailists);
  const listRef = useRef<HTMLDivElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (error && !teamContent) return <LoadError what="artists" onRetry={reload} />;
  if (loading || !teamContent) return <LoadingBar label="Loading our artists" />;
  // The heading, intro and strip title, as edited in Admin > Artists (or the defaults)
  const words = readTeamPage(teamContent);

  return (
    <PageShell>
      <Section>
        <PageHeader title={words.team_title} subtitle={words.team_description} />

        {nailists.length === 0 && (
          <StatePanel
            kind="empty"
            title="Our artists are being added"
            message="No artist profiles are published yet. Please check back soon, or contact us and we will gladly tell you who will take care of you."
          />
        )}

        <div ref={listRef} className="flex scroll-mt-24 flex-col gap-4 md:gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {pageItems.map((n) => (
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
                  to={artistPath(n)}
                  aria-label={`Learn more about ${n.name}`}
                  className="w-fit"
                >
                  Learn more
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
