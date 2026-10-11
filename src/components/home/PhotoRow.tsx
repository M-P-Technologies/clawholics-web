import { useState, type UIEvent } from "react";
import clsx from "clsx";
import SharpenFilter, { SHARPEN_FILTER } from "../ui/SharpenFilter";
import { InstagramIcon } from "../ui/SocialIcons";

export interface RowPhoto {
  id: number | string;
  url: string;
}

interface PhotoRowProps {
  photos: RowPhoto[];
  /** A heading above the strip, in the page's column */
  title?: string;
  /** Our Instagram: shown as a tag on the middle photo, and above the strip on phones */
  instagram?: { name: string; url: string } | null;
}

// A strip of square photos across the whole screen with thin gaps between them.
// From `sm` up all five sit side by side and the Instagram tag floats over the middle photo. The
// photos are shown as they are, with no dimming over them.
// On phones the photos scroll sideways, one at a time, with dots, under a "Follow us" line.
// From `sm` up the negative bottom margin cancels the section's bottom padding, so the strip sits
// against the footer. On phones the dots keep the normal space below them.
export default function PhotoRow({ photos, title, instagram }: PhotoRowProps) {
  const [active, setActive] = useState(0);
  const shown = photos.slice(0, 5);
  if (shown.length === 0) return null;

  // Each phone photo is 80% of the strip wide, so the nearest multiple tells which one is showing
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const strip = e.currentTarget;
    setActive(Math.round(strip.scrollLeft / (strip.clientWidth * 0.8)));
  };

  return (
    <div className="flex flex-col gap-4 sm:-mb-16 md:gap-8 lg:-mb-24">
      <SharpenFilter />
      {title && (
        <h2 className="font-display text-2xl font-normal uppercase tracking-widest text-gray-red md:text-4xl">
          {title}
        </h2>
      )}

      {instagram && (
        <a
          href={instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-2 text-gray-red sm:hidden"
        >
          <span className="text-sm text-gray-red/80">Follow us on Instagram</span>
          <span className="flex items-center gap-2">
            <InstagramIcon className="h-5 w-5 shrink-0 text-crimson" />
            <span className="truncate text-base font-bold">{instagram.name}</span>
          </span>
        </a>
      )}

      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <div
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto sm:grid sm:grid-cols-5 sm:overflow-visible"
        >
          {shown.map((photo, index) => (
            <div key={`${photo.id}-${index}`} className="relative w-4/5 shrink-0 snap-center sm:w-full">
              <img src={photo.url} alt="" loading="lazy" className="aspect-square w-full object-cover" style={{ filter: SHARPEN_FILTER }} />
            </div>
          ))}
        </div>

        {instagram && (
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow us on Instagram, ${instagram.name}`}
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-sm bg-light-orange px-4 py-2 text-sm font-bold text-gray-red shadow-xl shadow-crimson/20 transition-colors hover:text-crimson sm:inline-flex"
          >
            <InstagramIcon className="h-5 w-5 shrink-0 text-crimson" />
            {instagram.name}
          </a>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 sm:hidden" aria-hidden="true">
          {shown.map((photo, index) => (
            <span
              key={`${photo.id}-${index}`}
              className={clsx("h-2 w-2 rounded-full", index === active ? "bg-crimson" : "bg-crimson-light")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
