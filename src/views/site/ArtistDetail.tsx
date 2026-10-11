"use client";

import AlertModal from "../../components/ui/AlertModal";
import BackButton from "../../components/layout/BackButton";
import Button from "../../components/ui/Button";
import LoadError from "../../components/ui/LoadError";
import { LoadingBar } from "../../components/ui/LoadingBar";
import PageHeader from "../../components/layout/PageHeader";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import ServiceGallery from "../../components/booking/ServiceGallery";
import ServicePickerModal from "../../components/booking/ServicePickerModal";
import { infoLabelClass } from "../../components/ui/styles";
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
          <PageHeader
            align="center"
            title="Artist not found"
            subtitle="The artist you're looking for doesn't exist or may have been removed."
          />
          <Button to="/artists">Back to artists</Button>
        </Section>
      </PageShell>
    );
  }

  const photo = (
    <div className="overflow-hidden rounded-sm border border-crimson-light/80 bg-light-orange p-2 shadow-xl shadow-crimson/10">
      <img
        src={nailist.image}
        alt={`${nailist.name}, ${nailist.position}`}
        className="aspect-3/4 w-full rounded-sm object-cover object-top"
      />
    </div>
  );

  return (
    <PageShell>
      <Section>
        <div className="grid grid-cols-1 items-start gap-4 md:gap-8 lg:grid-cols-2">
          {/* ARTIST DETAILS */}
          <div className="flex flex-col gap-4 md:gap-8">
            <BackButton to="/artists" label="All artists" />
            {/* On phones the photo comes first, above the position pill; on desktop it sits beside the details */}
            <div className="lg:hidden">{photo}</div>
            <div className="flex flex-col gap-4">
              <p className="w-fit rounded-md border border-crimson-light px-4 py-1 text-sm font-bold uppercase tracking-widest text-crimson">
                {nailist.position}
              </p>
              <PageHeader title={nailist.name} subtitle={nailist.bio} />
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-crimson-light/80 pt-4 text-gray-red sm:grid-cols-[140px_1fr] sm:gap-y-4 md:pt-8 [&>dd:not(:last-child)]:mb-3 sm:[&>dd:not(:last-child)]:mb-0">
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
          <div className="hidden lg:block">{photo}</div>
        </div>

        {gallery.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-normal not-italic uppercase tracking-widest text-gray-red md:text-2xl">
              {nailist.name}&apos;s work
            </h2>
            <ServiceGallery images={gallery} label={`${nailist.name}'s work`} />
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={() => setPickerOpen(true)} className="px-8 sm:px-16">
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

      <AlertModal
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
