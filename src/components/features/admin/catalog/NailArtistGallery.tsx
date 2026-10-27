import { X } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN } from "@/lib/adminQueries";
import {
  deleteNailistGalleryImage,
  fetchNailistGallery,
  type NailistGalleryImage,
} from "@/services/nailistService";
import { Button, IconButton } from "@/components/atoms";
import { useToast } from "@/components/molecules";
import { itemName } from "@/lib/itemName";

const MAX_IMAGES = 10; // what the page and the visit photos keep (server/handlers/completions.ts)

interface NailArtistGalleryProps {
  /** The artist these photos belong to; null while the artist hasn't been created yet */
  nailistId: number | null;
  isEditing: boolean;
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  onPreview: (url: string) => void;
  /** After a photo is removed (it saves at once), e.g. to refresh a preview */
  onChanged?: () => void;
  /** The artist's name, for the messages about their photos */
  artistName?: string;
}

// The photos of an artist's work, shown on their page. They aren't uploaded here: each comes from a
// visit the artist completed (Complete visit), which keeps the database small. Removing one is saved
// at once (Save and Cancel don't apply to it).
export default function NailArtistGallery({ nailistId, isEditing, tokenFetcher, clerkId, onPreview, onChanged, artistName }: NailArtistGalleryProps) {
  const toast = useToast();
  const who = itemName(artistName, "this artist");
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  // The photos in order, cached per artist
  const galleryKey = [ADMIN, "nailists", nailistId, "gallery"];
  const galleryQuery = useQuery({
    queryKey: galleryKey,
    queryFn: async () => [...(await fetchNailistGallery(nailistId ?? 0))].sort((a, b) => a.position - b.position),
    enabled: nailistId !== null,
  });
  const images = galleryQuery.data ?? [];
  const loadFailed = galleryQuery.isError && !galleryQuery.data;
  // Photos save at once, so the cached list changes with them
  const setImages = (update: (prev: NailistGalleryImage[]) => NailistGalleryImage[]) =>
    queryClient.setQueryData<NailistGalleryImage[]>(galleryKey, (prev) => update(prev ?? []));

  const remove = async (image: NailistGalleryImage) => {
    setBusy(true);
    try {
      const token = tokenFetcher ? await tokenFetcher() : null;
      await deleteNailistGalleryImage(image.id, token, clerkId);
      setImages((prev) => prev.filter((item) => item.id !== image.id));
      onChanged?.();
    } catch (error) {
      console.error("Failed to remove artist photo:", error);
      toast.show("error", "Photo not removed", `We couldn't remove that photo from ${who}'s gallery, so it is still there. Please try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-gray-red">
          Photos of their work{nailistId !== null && ` (${images.length}/${MAX_IMAGES})`}
        </h3>
      </div>

      {nailistId === null ? (
        <p className="text-[13px] text-gray-red">Photos of their work appear here once visits by this artist are completed with a photo.</p>
      ) : loadFailed ? (
        <p role="alert" className="text-[13px] text-danger-ink">
          We couldn&apos;t load the photos of {who}. Please close and reopen the artist to try again.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="flex items-center justify-between w-full min-h-9 bg-milk rounded-md px-3 py-1 overflow-visible border border-crimson-light"
              >
                <Button
                  variant="bare"
                  type="button"
                  onClick={() => onPreview(image.image_url)}
                  className="min-w-0 flex-1 cursor-pointer text-left text-[13px] leading-none truncate text-gray-red hover:underline"
                >
                  {image.image_url.split("/").pop()}
                </Button>

                {isEditing && (
                  <IconButton size="sm" icon={X} label="Remove photo" onClick={() => remove(image)} disabled={busy} />
                )}
              </div>
            ))}
            {images.length === 0 && !isEditing && (
              <p className="text-[13px] text-gray-red">No photos yet. They appear here when a visit by this artist is completed with a photo.</p>
            )}
          </div>

          <p className="text-[13px] text-gray-red">
            {isEditing
              ? "These come from the visits this artist completes with a photo. Remove any you don't want shown on their page."
              : "Photos come from the visits this artist completes. Press Edit to remove any you don't want shown."}
          </p>
        </>
      )}
    </div>
  );
}
