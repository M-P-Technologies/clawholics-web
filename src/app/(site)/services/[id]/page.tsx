"use client";

import { AlertDialog } from "@/components/organisms";
import { Button, LoadingBar } from "@/components/atoms";
import { OnboardingGate } from "@/components/guards/OnboardingGate";
import BackButton from "@/components/layout/BackButton";
import { SectionHeader } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/layout/Panel";
import Section from "@/components/layout/Section";
import { infoLabelClass } from "@/components/tokens";
import PhotoCarousel from "@/components/booking/PhotoCarousel";
import ServiceGallery from "@/components/booking/ServiceGallery";
import ServiceOverview from "@/components/booking/ServiceOverview";
import { useAppointment } from "@/hooks/useAppointment";
import { peso } from "@/lib/dashboardFormat";

function Appointment() {
  const { priceLines, deposit, loading, service, gallery, carouselPhotos, terms, notFound, modalOpen, modalTitle, modalMessage, modalButtonText, modalAction, handleContinue, closeModal } = useAppointment();

  if (loading) return <LoadingBar label="Loading service details" />;

  if (notFound || !service) {
    return (
      <PageShell>
        <Section innerClassName="min-h-[70vh] items-center justify-center text-center gap-3 md:gap-6">
          <SectionHeader
            align="center"
            title="Service not found"
            subtitle="The service you're trying to book doesn't exist or may have been removed."
          />
          <Button to="/services">
            Back to services
          </Button>
        </Section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-3 md:gap-6">
          {/* SERVICE DETAILS */}
          <div className="flex flex-col gap-3 md:gap-6">
            <BackButton />
            {/* Phones and tablets: the category pill, then the photos as a carousel (the main photo
                first). From `lg` up the photos stay in the gallery at the bottom. */}
            <p className="w-fit rounded-full bg-crimson-light/40 px-3 py-1 label-caps text-berry lg:hidden">
              {service.category}
            </p>
            <div className="lg:hidden">
              <PhotoCarousel
                label={service.name}
                photos={carouselPhotos}
              />
            </div>
            {/* Phones and tablets get the compact overview; the table below is for `lg` and up */}
            <div className="lg:hidden">
              <ServiceOverview service={service} priceLines={priceLines} deposit={deposit} />
            </div>
            <div className="hidden flex-col gap-3 lg:flex">
              <p className="w-fit rounded-full bg-crimson-light/40 px-3 py-1 label-caps text-berry">
                {service.category}
              </p>
              {/* The phone overview above holds the page's one h1 (both are in the HTML; CSS shows one) */}
              <SectionHeader level={2} title={service.name} subtitle={service.description} />
            </div>

            <dl className="hidden grid-cols-1 gap-x-3 gap-y-1 border-t border-crimson-light/80 pt-3 text-gray-red lg:grid sm:grid-cols-[140px_1fr] sm:gap-y-3 md:pt-9 [&>dd:not(:last-child)]:mb-3 sm:[&>dd:not(:last-child)]:mb-0">
              <dt className={infoLabelClass}>Duration</dt>
              <dd>{service.duration}</dd>

              <dt className={infoLabelClass}>Price</dt>
              <dd className="flex flex-col gap-1">
                {priceLines.map((line) => (
                  <p key={line.id}>
                    <span className="font-bold">{line.label}</span>₱{line.amount}
                  </p>
                ))}

                <p className="copy-note">
                  Final fees vary depending on the complexity of your design. The rest of
                  the payment is settled after your session.
                </p>
              </dd>

              <dt className={infoLabelClass}>Deposit</dt>
              <dd className="flex flex-col gap-3">
                <p>
                  To secure your slot, a {deposit && <b>{peso(deposit.total)}</b>} booking deposit is required at checkout.
                </p>
                {deposit && (
                  <ul className="ml-3 list-disc text-gray-red">
                    <li>{peso(deposit.deductible)} is deductible from your final bill.</li>
                    <li>{peso(deposit.fee)} is a non-refundable reservation fee.</li>
                  </ul>
                )}
              </dd>
            </dl>
          </div>

          {/* TERMS */}
          <Panel title="Terms & conditions">
            <div className="flex flex-col gap-3 md:gap-6">
              {terms.map((term) => (
                <div key={term.id} className="flex flex-col gap-1">
                  <h3 className="label-caps">
                    {term.section}
                  </h3>
                  <p className="whitespace-pre-line copy-note">
                    {term.content}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {gallery.length > 0 && (
          <div className="hidden flex-col gap-3 lg:flex">
            <h2 className="font-display font-normal not-italic uppercase tracking-widest text-gray-red text-xl md:text-2xl">
              {service.name} gallery
            </h2>
            <ServiceGallery images={gallery} />
          </div>
        )}

        <div className="flex justify-center">
          <Button onClick={handleContinue} className="w-full sm:w-auto">
            Book now
          </Button>
        </div>
      </Section>

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

export default function Page() {
  return (
    <OnboardingGate showWhileChecking>
      <Appointment />
    </OnboardingGate>
  );
}
