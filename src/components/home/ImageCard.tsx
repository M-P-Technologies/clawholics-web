import type { ReactNode } from "react";
import clsx from "clsx";

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
  mobileLines = 2,
  footer,
}: ImageCardProps) {
  return (
    <article className="group flex h-full flex-row overflow-hidden sm:flex-col rounded-sm border border-crimson-light/80 bg-light-orange shadow-xl shadow-crimson/10 transition-colors duration-300 hover:border-crimson">
      <div className="p-2 max-sm:w-2/5 max-sm:shrink-0">
        <div className={clsx("w-full overflow-hidden rounded-sm bg-crimson-light", aspect, "max-sm:aspect-9/16")}>
          <img
            loading="lazy"
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 max-sm:pl-2 md:p-8">
        <div className="flex flex-col gap-2">
          <h3 id={titleId} className="font-display text-xl font-normal uppercase tracking-widest text-gray-red">
            {title}
          </h3>
          <div className="text-sm font-bold text-crimson">{subtitle}</div>
        </div>

        <p className={clsx("whitespace-pre-line text-sm leading-relaxed text-gray-red/80", DESCRIPTION_LINES[mobileLines])}>
          {description}
        </p>

        <div className="mt-auto">{footer}</div>
      </div>
    </article>
  );
}
