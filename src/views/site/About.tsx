"use client";

import { Clock, MapPin } from "lucide-react";
import { LoadingBar } from "../../components/ui/LoadingBar";
import LoadError from "../../components/ui/LoadError";
import StackedGallery from "../../components/home/StackedGallery";
import PageShell from "../../components/layout/PageShell";
import PageHeader from "../../components/layout/PageHeader";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import { useAbout } from "../../hooks/useAbout";
import Button from "../../components/ui/Button";

export default function About() {
  const { gallery, error, reload, data, copied, handleCopyLocation, aboutHtml, businessHours } = useAbout();

  if (error && !data) return <LoadError what="About us page" onRetry={reload} />;
  if (!data) return <LoadingBar label="Loading About us" />;

  return (
    <PageShell>
      <Section>
        <PageHeader title="About us" />
        <p className="sr-only">
          Learn more about Clawholics by Max, our nail studio location,
          operating hours, and salon philosophy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div
            className="flow-root whitespace-pre-line text-base leading-8 text-gray-red/80 md:col-span-2"
          >
            <div className="mb-8 h-fit w-full overflow-hidden whitespace-normal rounded-sm border border-crimson-light/80 bg-light-orange p-2 shadow-xl shadow-crimson/10 md:float-right md:mb-4 md:ml-8 md:w-1/2">
              <img
                src={data.about_image}
                alt="Interior of Clawholics by Max nail studio"
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-sm object-cover"
              />
            </div>
            <div dangerouslySetInnerHTML={{ __html: aboutHtml }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
          <Panel title="Location" className="min-w-0">
            <Button
              variant="bare"
              type="button"
              onClick={handleCopyLocation}
              aria-label="Copy salon address"
              title="Click to copy address."
              className="flex w-full cursor-pointer items-start gap-2 whitespace-normal rounded-md text-left text-gray-red transition-colors hover:text-crimson focus-visible:outline-2 focus-visible:outline-crimson"
            >
              <MapPin aria-hidden="true" focusable="false" size={24} className="shrink-0 text-crimson" />
              <span className="min-w-0 flex-1">{data.about_location}</span>
            </Button>
            {copied && (
              <p role="status" aria-live="polite" className="text-sm text-crimson">
                Address copied to clipboard.
              </p>
            )}

            {data.about_location_url ? (
              <iframe
                title="Map showing Clawholics by Max location"
                src={data.about_location_url}
                className="h-60 w-full rounded-sm border border-crimson-light"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            ) : (
              <p className="text-gray-red/70">Map not available</p>
            )}
          </Panel>

          <Panel title="Business hours" className="min-w-0">
            <dl>
              {businessHours.map(({ day, time }) => (
                <div
                  key={day}
                  className="flex items-center justify-between gap-4 border-b border-crimson-light/80 py-4 text-gray-red"
                >
                  <dt className="flex items-center gap-4 font-medium">
                    <Clock aria-hidden="true" focusable="false" size={20} className="shrink-0 text-crimson" />
                    {day}
                  </dt>
                  <dd className="whitespace-nowrap">{time}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        {gallery.length > 0 && (
          <div className="flex flex-col gap-4 md:gap-8">
            <h2 className="font-display text-2xl font-normal uppercase tracking-widest text-gray-red md:text-4xl">
              Gallery
            </h2>
            <StackedGallery
              label="Studio gallery"
              photos={gallery.map((photo) => ({ id: photo.id, url: photo.image_url }))}
            />
          </div>
        )}
      </Section>
    </PageShell>
  );
}
