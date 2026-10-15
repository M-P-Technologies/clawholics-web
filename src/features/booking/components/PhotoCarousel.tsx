import { useRef, useState, type UIEvent } from "react";
import Image from "next/image";
import clsx from "clsx";

type Photo = { id: number | string; image_url: string };

interface PhotoCarouselProps {
  photos: Photo[];
  /** Said for each photo, e.g. "Softgel Extensions" */
  label: string;
  /** The shape of every frame, as a Tailwind aspect class. Square by default; an artist's portrait is "aspect-3/4". */
  aspect?: string;
}

// A swipeable row of framed photos, one at a time, with dots. Each photo sits in a cream frame
// like the photos on the artist page. Scroll-snap does the swiping, so it works with touch,
// the keyboard and a mouse wheel without any script.
export default function PhotoCarousel({ photos, label, aspect = "aspect-square" }: PhotoCarouselProps) {
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
    <div role="region" aria-roledescription="carousel" aria-label={`${label} photos`} className="flex flex-col gap-4">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((photo, index) => (
          <div key={photo.id} className="w-full shrink-0 snap-center">
            <div className="overflow-hidden rounded-sm border border-crimson-light/80 bg-light-orange p-2 shadow-xl shadow-crimson/10">
              <div className={clsx("relative w-full overflow-hidden rounded-sm bg-sand/50", aspect)}>
                <Image
                  src={photo.image_url}
                  alt={`${label}, photo ${index + 1} of ${photos.length}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 560px"
                  priority={index === 0}
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === active}
              onClick={() => show(index)}
              className={clsx(
                "h-2 cursor-pointer rounded-full transition-all duration-300",
                index === active ? "w-6 bg-crimson" : "w-2 bg-crimson-light",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
