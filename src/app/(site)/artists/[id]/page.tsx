"use client";

import { publicPosition } from "@/lib/artistRoles";
import { AlertDialog } from "@/components/organisms";
import ArtistOverview from "@/components/booking/ArtistOverview";
import PhotoCarousel from "@/components/booking/PhotoCarousel";
import BackButton from "@/components/layout/BackButton";
import { Button, LoadingBar } from "@/components/atoms";
import { LoadError, SectionHeader } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import ServiceGallery from "@/components/booking/ServiceGallery";
import ServicePickerModal from "@/components/booking/ServicePickerModal";
import SpecialtyList from "@/components/booking/SpecialtyList";
import { infoLabelClass } from "@/components/tokens";
import { useArtistDetail } from "@/hooks/useArtistDetail";

// One artist's page, laid out like a service's page: details, a gallery of their work, and a
// button that starts a booking with them already chosen.
export default function ArtistDetail() {
  const {
    loading, notFound, error, reload, nailist, gallery, carouselPhotos, offeredServices,
    pickerOpen, setPickerOpen, pickService,
    modalOpen, modalTitle, modalMessage, modalButtonText, modalAction, closeModal,
  } = useArtistDetail();

  if (loading) return <LoadingBar label="Loading artist" />;
  if (error) return <LoadError what="artist" onRetry={reload} />;

  if (notFound || !nailist) {
    return (
      <PageShell>
        <Section innerClassName="min-h-[70vh] items-center justify-center text-center gap-3 md:gap-6">
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

  return (
    <PageShell>
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-3 md:gap-6">
          {/* ARTIST DETAILS */}
          <div className="flex flex-col gap-3 md:gap-6">
            <BackButton to="/artists" label="All artists" />
            {/* Phones and tablets: the position pill, the photos as a carousel, then the compact
                overview. From `lg` up: the details here and the photo beside them. */}
            {publicPosition(nailist) && (
              <p className="w-fit rounded-full bg-crimson-light/40 px-3 py-1 label-caps text-berry lg:hidden">
                {publicPosition(nailist)}
              </p>
            )}
            <div className="lg:hidden">
              <PhotoCarousel label={nailist.name} photos={carouselPhotos} aspect="aspect-3/4" />
            </div>
            <div className="lg:hidden">
              <ArtistOverview nailist={nailist} workCount={gallery.length} />
            </div>
            <div className="hidden flex-col gap-3 lg:flex">
              {publicPosition(nailist) && (
                <p className="w-fit rounded-full bg-crimson-light/40 px-3 py-1 label-caps text-berry">
                  {publicPosition(nailist)}
                </p>
              )}
              {/* The phone overview above holds the page's one h1 (both are in the HTML; CSS shows one) */}
              <SectionHeader level={2} title={nailist.name} subtitle={nailist.bio} />
            </div>

            <dl className="hidden grid-cols-1 gap-x-3 gap-y-1 border-t border-crimson-light/80 pt-3 text-gray-red lg:grid sm:grid-cols-[140px_1fr] sm:gap-y-3 md:pt-9 [&>dd:not(:last-child)]:mb-3 sm:[&>dd:not(:last-child)]:mb-0">
              {nailist.specialty && (
                <>
                  {/* The list keeps to the right column but starts a row below its label, so the
                      first item isn't level with "Specialties" */}
                  <dt className={`${infoLabelClass} sm:col-span-2`}>Specialties</dt>
                  <dd className="sm:col-start-2">
                    <SpecialtyList specialty={nailist.specialty} />
                  </dd>
                </>
              )}

              {nailist.offered_services && nailist.offered_services.length > 0 && (
                <>
                  {/* Like Specialties: right column, a row below the label */}
                  <dt className={`${infoLabelClass} sm:col-span-2`}>Services</dt>
                  <dd className="flex flex-wrap gap-3 sm:col-start-2">
                    {nailist.offered_services.map((name) => (
                      <span key={name} className="rounded-full bg-crimson-light/40 px-3 py-1 text-sm text-berry">
                        {name}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* PHOTO (desktop) */}
          <div className="hidden overflow-hidden rounded-2xl border border-crimson-light/40 bg-light-orange p-2 shadow-petal lg:block">
            <img
              src={nailist.image}
              alt={`${nailist.name}${publicPosition(nailist) ? `, ${publicPosition(nailist)}` : ""}`}
              className="aspect-3/4 w-full rounded-xl object-cover object-top"
            />
          </div>
        </div>

        {gallery.length > 0 && (
          <div className="hidden flex-col gap-3 lg:flex">
            <h2 className="font-display text-xl font-normal not-italic uppercase tracking-widest text-gray-red md:text-2xl">
              {nailist.name}&apos;s work
            </h2>
            <ServiceGallery images={gallery} label={`${nailist.name}'s work`} />
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={() => setPickerOpen(true)} className="w-full sm:w-auto">
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
