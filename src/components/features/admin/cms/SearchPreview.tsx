interface SearchPreviewProps {
  /** The title as a search result shows it */
  title: string;
  /** The address under it, e.g. "clawholicsbymax.com/services" */
  address: string;
  description: string;
}

// How a page looks in a search result, so a title and description can be judged as they're typed.
// Search engines cut a long title and description off (about 60 and 155 characters).
export default function SearchPreview({ title, address, description }: SearchPreviewProps) {
  return (
    <div aria-label="Search result preview" className="flex flex-col gap-0.5 rounded-xl bg-crimson-light/15 p-3">
      <p className="truncate text-xs text-gray-red">{address}</p>
      <p className="line-clamp-2 font-display text-lg leading-snug text-crimson-ink">{title}</p>
      <p className="line-clamp-2 text-[13px] leading-snug text-gray-red">{description}</p>
    </div>
  );
}
