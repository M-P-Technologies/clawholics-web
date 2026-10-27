import { X } from "lucide-react";
import type { ReactNode } from "react";
import { DragHandle, SortableList } from "@/components/molecules";
import { IconButton } from "@/components/atoms";
import WorkPhotoPicker from "@/components/features/admin/cms/WorkPhotoPicker";
import type { WorkPhoto } from "@/hooks/admin/useArtistWorkPhotos";
import type { CarouselItem } from "@/services/carouselService";

export const MAX_CAROUSEL_IMAGES = 10;

/** The photos in order, numbered from 1 */
export const normalizeCarousel = (items: CarouselItem[]) =>
  items.slice(0, MAX_CAROUSEL_IMAGES).map((item, index) => ({ ...item, position: index + 1 }));

const fileName = (url: string) => url.split("/").pop() || url;

interface CarouselEditorProps {
  photos: CarouselItem[];
  onChange: (photos: CarouselItem[]) => void;
  /** The photos already in the database (the artists' work) the gallery can use */
  choices: WorkPhoto[];
  choicesLoading?: boolean;
}

// The studio gallery's photos: drag to reorder, remove, or pick more from the artists' work (up to
// MAX_CAROUSEL_IMAGES). Nothing is uploaded here, so the same photo isn't stored twice.
export default function CarouselEditor({ photos, onChange, choices, choicesLoading = false }: CarouselEditorProps) {
  const add = (url: string) => {
    if (photos.length < MAX_CAROUSEL_IMAGES) onChange(normalizeCarousel([...photos, { id: -Date.now(), image_url: url, position: photos.length + 1 }]));
  };

  return (
    <>
      {photos.length > 0 && (
        <SortableList
          items={photos}
          getItemId={(item) => item.id}
          onReorder={(items) => onChange(normalizeCarousel(items))}
          className="flex flex-col gap-3"
          renderItem={(item, { dragHandleProps, isDragging }) => (
            <CarouselRow item={item} dragHandle={<DragHandle {...dragHandleProps} />} faded={isDragging} onRemove={() => onChange(normalizeCarousel(photos.filter((p) => p.id !== item.id)))} />
          )}
          renderOverlay={(item) => <CarouselRow item={item} />}
        />
      )}
      {photos.length >= MAX_CAROUSEL_IMAGES ? (
        <p className="text-[13px] text-gray-red">The gallery is full. Remove a photo to add another.</p>
      ) : (
        <WorkPhotoPicker choices={choices} taken={photos.map((p) => p.image_url)} loading={choicesLoading} onPick={add} />
      )}
    </>
  );
}

function CarouselRow({ item, dragHandle, faded = false, onRemove }: { item: CarouselItem; dragHandle?: ReactNode; faded?: boolean; onRemove?: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-crimson-light/60 bg-milk p-2 ${faded ? "opacity-0" : ""}`}>
      {dragHandle}
      {/* eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS like the rest of the admin */}
      <img src={item.image_url} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-gray-red">{fileName(item.image_url)}</span>
      {onRemove && <IconButton size="sm" icon={X} label={`Remove ${fileName(item.image_url)}`} onClick={onRemove} />}
    </div>
  );
}
