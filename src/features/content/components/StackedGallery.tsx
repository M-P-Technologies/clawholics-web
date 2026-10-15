import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import SharpenFilter, { SHARPEN_FILTER } from "../../../components/ui/SharpenFilter";

export interface GalleryPhoto {
  id: number | string;
  url: string;
}

// How the photos sit, by how far they are from the one in front: the front photo is full size in
// the middle, and the next two peek out behind it, one on each side, smaller.
const SLOTS = [
  { left: "12.5%", scale: 1, opacity: 1 },
  { left: "0%", scale: 0.88, opacity: 0.85 },
  { left: "25%", scale: 0.88, opacity: 0.6 },
];

// Photo stack with arrows and dots: moving on brings the next photo to the front and tucks
// the current one behind it.
export default function StackedGallery({ photos, label = "Photo gallery" }: { photos: GalleryPhoto[]; label?: string }) {
  const [current, setCurrent] = useState(0);
  const count = photos.length;

  if (count === 0) return null;

  const go = (step: number) => setCurrent((i) => (i + step + count) % count);

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="flex flex-col gap-4 md:gap-8">
      <SharpenFilter />
      {/* The front photo is 3/4 of this box wide and as tall as the box: square photos need a box of 4:3 (phones), 16:9 photos a box of 64:27 */}
      <div className="relative z-10 aspect-4/3 w-full sm:aspect-64/27">
        {/* A dark band across the whole screen: it starts halfway down the photos and runs past the
            controls to the footer. The negative bottom is the controls (40px) + the gap + the
            section's bottom padding. */}
        <div
          aria-hidden="true"
          className="absolute -bottom-30 left-1/2 top-2/3 -z-10 w-screen -translate-x-1/2 bg-gray-red md:-bottom-34 lg:-bottom-42"
        />
        {photos.map((photo, index) => {
          const depth = (index - current + count) % count;
          const slot = SLOTS[depth];
          return (
            <img
              key={`${photo.id}-${index}`}
              src={photo.url}
              alt={depth === 0 ? `${label}: photo ${index + 1} of ${count}` : ""}
              aria-hidden={depth !== 0}
              loading="lazy"
              className={clsx(
                "absolute inset-y-0 aspect-square h-full w-3/4 sm:aspect-video rounded-sm border border-crimson-light/80 bg-light-orange object-cover shadow-xl shadow-crimson/10 transition-[left,transform,opacity] duration-700 ease-out motion-reduce:transition-none",
                !slot && "pointer-events-none",
              )}
              style={{
                left: slot ? slot.left : "12.5%",
                transform: `scale(${slot ? slot.scale : 1.05})`,
                opacity: slot ? slot.opacity : 0,
                zIndex: slot ? count - depth : 0,
                filter: SHARPEN_FILTER,
              }}
            />
          );
        })}
      </div>

      {count > 1 && (
        <div className="relative z-10 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => go(-1)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-light-orange text-light-orange transition-colors hover:bg-crimson hover:border-crimson"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            {photos.map((photo, index) => (
              <button
                key={`${photo.id}-${index}`}
                type="button"
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === current}
                onClick={() => setCurrent(index)}
                className={clsx(
                  "h-2 cursor-pointer rounded-full transition-all duration-300",
                  index === current ? "w-6 bg-crimson" : "w-2 bg-light-orange/40 hover:bg-light-orange",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next photo"
            onClick={() => go(1)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-light-orange text-light-orange transition-colors hover:bg-crimson hover:border-crimson"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
