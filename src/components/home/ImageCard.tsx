import type { ReactNode } from "react";
import clsx from "clsx";
import Image from "next/image";
import { canOptimizeImage } from "@/lib/imageHosts";

interface ImageCardProps {
  image: string;
  imageAlt: string;
  /** Tailwind aspect class for the photo, for example "aspect-3/4" */
  aspect: string;
  title: string;
  /** Id for the title, so a button can point at the card by name */
  titleId?: string;
  /** Small line under the title, for example a role or a price */
  subtitle: ReactNode;
  description: string;
  /** How many lines of the description show on phones. From `sm` up it is always 3. */
  mobileLines?: 2 | 3;
  /** Buttons and details at the bottom of the card */
  footer: ReactNode;
  /** The first card on the page: its photo is loaded first, as the page's main image */
  priority?: boolean;
}

// The framed photo card shared by the Services and Artists pages: photo with a cream
// frame, a title and subtitle, three lines of text, and the actions at the bottom.
// On phones the photo sits beside the text to save height; from `sm` up it is stacked above.
const DESCRIPTION_LINES = {
  2: "line-clamp-2 min-h-[3.25em] sm:line-clamp-3 sm:min-h-[4.875em]",
  3: "line-clamp-3 min-h-[4.875em]",
};

export default function ImageCard({
  image,
  imageAlt,
  aspect,
  title,
  titleId,
  subtitle,
  description,
  mobileLines = 3,
  footer,
  priority = false,
}: ImageCardProps) {
  return (
    <article className="group flex h-full flex-row overflow-hidden sm:flex-col rounded-2xl border border-crimson-light/40 bg-light-orange shadow-petal transition-colors duration-300 hover:border-crimson">
      <div className="p-3 max-sm:w-2/5 max-sm:shrink-0">
        <div className={clsx("relative w-full overflow-hidden rounded-xl bg-crimson-light", aspect, "max-sm:aspect-9/16")}>
          {/* A service or artist without a photo keeps the pink box: an <img> with no source is a broken image */}
          {image ? (
            <Image
              src={image}
              alt={imageAlt}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 40vw"
              unoptimized={!canOptimizeImage(image)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 max-sm:pl-2 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="font-display text-xl font-normal uppercase tracking-widest text-gray-red">
            {title}
          </h2>
          <div className="text-sm font-bold text-crimson-ink">{subtitle}</div>
        </div>

        <p className={clsx("whitespace-pre-line copy-body text-sm md:text-base", DESCRIPTION_LINES[mobileLines])}>
          {description}
        </p>

        <div className="mt-auto">{footer}</div>
      </div>
    </article>
  );
}
