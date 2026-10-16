"use client";

import { Clock, MapPin } from "lucide-react";
import { LoadingBar, Button } from "@/components/atoms";
import { LoadError, SectionHeader } from "@/components/molecules";
import StackedGallery from "@/components/home/StackedGallery";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/layout/Panel";
import Section from "@/components/layout/Section";
import MapFrame from "@/components/home/MapFrame";
import { useAbout } from "@/hooks/useAbout";

export default function About() {
  const { gallery, galleryPhotos, error, reload, data, copied, handleCopyLocation, aboutHtml, businessHours } = useAbout();

  if (error && !data) return <LoadError what="About us page" onRetry={reload} />;
  if (!data) return <LoadingBar label="Loading About us" />;

  return (
    <PageShell>
      <Section>
        <SectionHeader title="About us" />
        <p className="sr-only">
          Learn more about Clawholics by Max, our nail studio location,
          operating hours, and salon philosophy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-9">
          <div
            className="flow-root whitespace-pre-line text-base leading-8 text-gray-red md:col-span-2"
          >
            <div className="mb-9 h-fit w-full overflow-hidden whitespace-normal rounded-sm border border-crimson-light/80 bg-light-orange p-2 shadow-xl shadow-crimson/10 md:float-right md:mb-3 md:ml-9 md:w-1/2">
              <img
                src={data.about_image}
                alt="Interior of Clawholics by Max nail studio"
                fetchPriority="high"
                className="aspect-square w-full rounded-sm object-cover"
              />
            </div>
            <div dangerouslySetInnerHTML={{ __html: aboutHtml }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-9">
          <Panel title="Location" className="min-w-0">
            <Button
              variant="bare"
              type="button"
              onClick={handleCopyLocation}
              title="Click to copy address."
              className="flex w-full cursor-pointer items-center gap-3 whitespace-normal rounded-md text-left text-gray-red transition-colors hover:text-crimson-ink focus-visible:outline-2 focus-visible:outline-crimson"
            >
              <MapPin aria-hidden="true" focusable="false" size={24} className="shrink-0 text-crimson" />
              <span className="min-w-0 flex-1"><span className="sr-only">Copy salon address: </span>{data.about_location}</span>
            </Button>
            {copied && (
              <p role="status" aria-live="polite" className="text-sm text-crimson-ink">
                Address copied to clipboard.
              </p>
            )}

            {data.about_location_url ? (
              <MapFrame src={data.about_location_url} className="h-60 w-full overflow-hidden rounded-sm border border-crimson-light" />
            ) : (
              <p className="text-gray-red">Map not available</p>
            )}
          </Panel>

          <Panel title="Business hours" className="min-w-0">
            <dl>
              {businessHours.map(({ day, time }) => (
                <div
                  key={day}
                  className="flex items-center justify-between gap-3 border-b border-crimson-light/80 py-3 text-gray-red"
                >
                  <dt className="flex items-center gap-3 font-medium">
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
          <div className="flex flex-col gap-3 md:gap-9">
            <h2 className="font-display text-2xl font-normal uppercase tracking-widest text-gray-red md:text-4xl">
              Gallery
            </h2>
            <StackedGallery
              label="Studio gallery"
              photos={galleryPhotos}
            />
          </div>
        )}
      </Section>
    </PageShell>
  );
}
