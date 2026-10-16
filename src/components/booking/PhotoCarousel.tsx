import { useRef, useState, type UIEvent } from "react";
import Image from "next/image";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = { id: number | string; image_url: string };

interface PhotoCarouselProps {
  photos: Photo[];
  /** Said for each photo, e.g. "Softgel Extensions" */
  label: string;
  /** The shape of every frame, as a Tailwind aspect class. Square by default; an artist's portrait is "aspect-3/4". */
  aspect?: string;
  /** The cream frame around each photo (the public pages); false for edge-to-edge photos at the top
   *  of a card, e.g. the Explore panel */
  framed?: boolean;
  /** next/image sizes for the photos */
  sizes?: string;
  /** "cover" fills the frame (cropping the edges); "contain" shows each whole photo, centred, so a
   *  portrait or square photo isn't blown up to fill a wide frame */
  fit?: "cover" | "contain";
  /** Previous and next arrows over the photos (wrapping round), besides swiping and the dots */
  arrows?: boolean;
}

// The photo strip's round arrow buttons (components/home/PhotoStrip)
const ARROW =
  "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-crimson-light bg-light-orange text-crimson-ink shadow-md shadow-crimson/20 transition-colors hover:bg-crimson hover:text-light-orange focus-visible:outline-2 focus-visible:outline-crimson";

// A swipeable row of framed photos, one at a time, with dots. Each photo sits in a cream frame
// like the photos on the artist page. Scroll-snap does the swiping, so it works with touch,
// the keyboard and a mouse wheel without any script.
export default function PhotoCarousel({ photos, label, aspect = "aspect-square", framed = true, sizes = "(max-width: 1024px) 100vw, 560px", fit = "cover", arrows = false }: PhotoCarouselProps) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  if (photos.length === 0) return null;

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  const show = (index: number) => {
    const track = trackRef.current;
    track?.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={`${label} photos`} className={clsx("flex flex-col", framed ? "gap-3" : "gap-1")}>
      <div className="relative">
      {arrows && photos.length > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={() => show((active - 1 + photos.length) % photos.length)} className={clsx(ARROW, "left-3")}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next photo" onClick={() => show((active + 1) % photos.length)} className={clsx(ARROW, "right-3")}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </>
      )}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((photo, index) => (
          <div key={photo.id} className="w-full shrink-0 snap-center">
            <div className={clsx(framed && "overflow-hidden rounded-sm border border-crimson-light/80 bg-light-orange p-2 shadow-xl shadow-crimson/10")}>
              <div className={clsx("relative w-full overflow-hidden bg-sand/50", framed && "rounded-sm", aspect)}>
                <Image
                  src={photo.image_url}
                  alt={`${label}, photo ${index + 1} of ${photos.length}`}
                  fill
                  sizes={sizes}
                  priority={index === 0}
                  className={fit === "contain" ? "object-contain" : "object-cover"}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {photos.length > 1 && (
        <div className="flex items-center justify-center">
          {photos.map((photo, index) => (
            // The dot is drawn inside a 24px button, the smallest tap target WCAG allows
            <button
              key={photo.id}
              type="button"
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === active}
              onClick={() => show(index)}
              className="flex h-6 min-w-6 cursor-pointer items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "h-2 rounded-full transition-all duration-300",
                  index === active ? "w-6 bg-crimson" : "w-2 bg-crimson-light",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
