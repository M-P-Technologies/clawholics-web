import { X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { DragHandle, SortableList } from "@/components/molecules";
import { Button } from "@/components/atoms";
import { DropArea } from "@/components/features/admin/cms/fields";
import type { CarouselItem } from "@/services/carouselService";

export const MAX_CAROUSEL_IMAGES = 10;

/** The photos in order, numbered from 1 */
export const normalizeCarousel = (items: CarouselItem[]) =>
  items.slice(0, MAX_CAROUSEL_IMAGES).map((item, index) => ({ ...item, position: index + 1 }));

const fileName = (url: string) => url.split("/").pop() || url;

interface CarouselEditorProps {
  photos: CarouselItem[];
  onChange: (photos: CarouselItem[]) => void;
  uploading: boolean;
  /** Uploads a photo and returns its URL, or null when it failed (and said so) */
  upload: (file: File) => Promise<string | null>;
}

// The studio gallery's photos: drag to reorder, remove, or add up to MAX_CAROUSEL_IMAGES
export default function CarouselEditor({ photos, onChange, uploading, upload }: CarouselEditorProps) {
  const inputId = useId();

  const add = async (file?: File) => {
    if (!file) return;
    const url = await upload(file);
    if (url && photos.length < MAX_CAROUSEL_IMAGES) {
      onChange(normalizeCarousel([...photos, { id: -Date.now(), image_url: url, position: photos.length + 1 }]));
    }
  };

  return (
    <>
      {photos.length > 0 && (
        <SortableList
          items={photos}
          getItemId={(item) => item.id}
          onReorder={(items) => onChange(normalizeCarousel(items))}
          className="flex flex-col gap-2"
          renderItem={(item, { dragHandleProps, isDragging }) => (
            <CarouselRow item={item} dragHandle={<DragHandle {...dragHandleProps} />} faded={isDragging} onRemove={() => onChange(normalizeCarousel(photos.filter((p) => p.id !== item.id)))} />
          )}
          renderOverlay={(item) => <CarouselRow item={item} />}
        />
      )}
      {photos.length < MAX_CAROUSEL_IMAGES ? (
        <DropArea
          id={inputId}
          uploading={uploading}
          onFile={add}
          label="Add a photo"
          input={
            <input
              id={inputId}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              disabled={uploading}
              className="sr-only"
              onChange={(e) => {
                add(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          }
        />
      ) : (
        <p className="text-[13px] text-gray-red/70">The gallery is full. Remove a photo to add another.</p>
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
      {onRemove && (
        <Button type="button" variant="bare" aria-label={`Remove ${fileName(item.image_url)}`} onClick={onRemove} className="rounded-full p-1.5 text-crimson hover:bg-crimson-light/30">
          <X size={16} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
