"use client";

import { AlertDialog } from "@/components/organisms";
import ArtistOverview from "../../components/booking/ArtistOverview";
import PhotoCarousel from "../../components/booking/PhotoCarousel";
import BackButton from "../../components/layout/BackButton";
import { Button } from "@/components/atoms";
import { LoadError, SectionHeader } from "@/components/molecules";
import { LoadingBar } from "@/components/atoms";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import ServiceGallery from "../../components/booking/ServiceGallery";
import ServicePickerModal from "../../components/booking/ServicePickerModal";
import { infoLabelClass } from "@/components/tokens";
import { useArtistDetail } from "../../hooks/useArtistDetail";

// One artist's page, laid out like a service's page: details, a gallery of their work, and a
// button that starts a booking with them already chosen.
export default function ArtistDetail() {
  const {
    loading, notFound, error, reload, nailist, gallery, offeredServices,
    pickerOpen, setPickerOpen, pickService,
    modalOpen, modalTitle, modalMessage, modalButtonText, modalAction, closeModal,
  } = useArtistDetail();

  if (loading) return <LoadingBar label="Loading artist" />;
  if (error) return <LoadError what="artist" onRetry={reload} />;

  if (notFound || !nailist) {
    return (
      <PageShell>
        <Section innerClassName="min-h-[70vh] items-center justify-center text-center gap-4 md:gap-8">
          <SectionHeader
            align="center"
            title="Artist not found"
            subtitle="The artist you're looking for doesn't exist or may have been removed."
          />
          <Button to="/artists">Back to artists</Button>
        </Section>
      </PageShell>
    );
  }

  // Phones: the portrait first, then the photos of their work, in one carousel
  const carouselPhotos = [{ id: "portrait", image_url: nailist.image }, ...gallery];

  return (
    <PageShell>
      <Section innerClassName="max-lg:pt-4">
        <div className="grid grid-cols-1 items-start gap-4 md:gap-8 lg:grid-cols-2">
          {/* ARTIST DETAILS */}
          <div className="flex flex-col gap-4 md:gap-8">
            <BackButton to="/artists" label="All artists" />
            {/* Phones and tablets: the position pill, the photos as a carousel, then the compact
                overview. From `lg` up: the details here and the photo beside them. */}
            <p className="w-fit rounded-md border border-crimson-light px-4 py-1 label-caps text-crimson lg:hidden">
              {nailist.position}
            </p>
            <div className="lg:hidden">
              <PhotoCarousel label={nailist.name} photos={carouselPhotos} aspect="aspect-3/4" />
            </div>
            <div className="lg:hidden">
              <ArtistOverview nailist={nailist} workCount={gallery.length} />
            </div>
            <div className="hidden flex-col gap-4 lg:flex">
              <p className="w-fit rounded-md border border-crimson-light px-4 py-1 label-caps text-crimson">
                {nailist.position}
              </p>
              <SectionHeader title={nailist.name} subtitle={nailist.bio} />
            </div>

            <dl className="hidden grid-cols-1 gap-x-4 gap-y-1 border-t border-crimson-light/80 pt-4 text-gray-red lg:grid sm:grid-cols-[140px_1fr] sm:gap-y-4 md:pt-8 [&>dd:not(:last-child)]:mb-3 sm:[&>dd:not(:last-child)]:mb-0">
              {nailist.specialty && (
                <>
                  <dt className={infoLabelClass}>Specialties</dt>
                  <dd className="whitespace-pre-line">{nailist.specialty}</dd>
                </>
              )}

              {nailist.offered_services && nailist.offered_services.length > 0 && (
                <>
                  <dt className={infoLabelClass}>Services</dt>
                  <dd className="flex flex-wrap gap-2">
                    {nailist.offered_services.map((name) => (
                      <span key={name} className="rounded-md border border-crimson-light px-4 py-1 text-sm text-crimson">
                        {name}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* PHOTO (desktop) */}
          <div className="hidden overflow-hidden rounded-sm border border-crimson-light/80 bg-light-orange p-2 shadow-xl shadow-crimson/10 lg:block">
            <img
              src={nailist.image}
              alt={`${nailist.name}, ${nailist.position}`}
              className="aspect-3/4 w-full rounded-sm object-cover object-top"
            />
          </div>
        </div>

        {gallery.length > 0 && (
          <div className="hidden flex-col gap-4 lg:flex">
            <h2 className="font-display text-xl font-normal not-italic uppercase tracking-widest text-gray-red md:text-2xl">
              {nailist.name}&apos;s work
            </h2>
            <ServiceGallery images={gallery} label={`${nailist.name}'s work`} />
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={() => setPickerOpen(true)} className="w-full px-8 sm:w-auto sm:px-16">
            Book this artist
          </Button>
        </div>
      </Section>

      <ServicePickerModal
        open={pickerOpen}
        artistName={nailist.name}
        services={offeredServices}
        onPick={pickService}
        onClose={() => setPickerOpen(false)}
      />

      <AlertDialog
        open={modalOpen}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={closeModal}
        onAction={modalAction}
      />
    </PageShell>
  );
}
