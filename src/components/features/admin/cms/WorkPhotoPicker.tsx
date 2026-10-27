import type { WorkPhoto } from "@/hooks/admin/useArtistWorkPhotos";

const fileName = (url: string) => url.split("/").pop() || url;

interface WorkPhotoPickerProps {
  /** Every photo in the database that can be chosen */
  choices: WorkPhoto[];
  /** URLs already used, left out of the list */
  taken: string[];
  loading?: boolean;
  onPick: (url: string) => void;
  title?: string;
  /** Shown when there is nothing to choose */
  emptyText?: string;
}

// Photos are never uploaded here: they're picked from the artists' work (the photos added when a
// visit is completed), so one picture isn't stored twice.
export default function WorkPhotoPicker({ choices, taken, loading = false, onPick, title = "Choose from the artists' work", emptyText = "No more photos to choose from. They come from the visits the artists complete with a photo." }: WorkPhotoPickerProps) {
  const available = choices.filter((c) => !taken.includes(c.url));
  if (loading) return <p role="status" className="text-[13px] text-gray-red">Loading the artists&apos; photos…</p>;
  if (available.length === 0) {
    return <p className="text-[13px] text-gray-red">{emptyText}</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {title && <p className="text-[13px] font-medium text-gray-red">{title}</p>}
      <ul className="grid grid-cols-3 gap-2">
        {available.map((choice) => (
          <li key={choice.url}>
            <button
              type="button"
              onClick={() => onPick(choice.url)}
              aria-label={`Add ${fileName(choice.url)} by ${choice.artist}`}
              className="block aspect-square w-full overflow-hidden rounded-md border border-crimson-light focus-visible:outline-2 focus-visible:outline-crimson"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS like the rest of the admin */}
              <img src={choice.url} alt="" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
