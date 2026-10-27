import { X as XIcon } from "lucide-react";
import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN } from "@/lib/adminQueries";
import {
  addNailistGalleryImage,
  deleteNailistGalleryImage,
  fetchNailistGallery,
  type NailistGalleryImage,
} from "@/services/nailistService";
import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "@/services/uploadService";
import { Button } from "@/components/atoms";
import { DropArea } from "@/components/features/admin/cms/fields";
import { useToast } from "@/components/molecules";
import { itemName, upperFirst } from "@/lib/itemName";

const MAX_IMAGES = 10;

interface NailArtistGalleryProps {
  /** The artist these photos belong to; null while the artist hasn't been created yet */
  nailistId: number | null;
  isEditing: boolean;
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  onPreview: (url: string) => void;
  /** After a photo is added or removed (they save at once), e.g. to refresh a preview */
  onChanged?: () => void;
  /** The artist's name, for the messages about their photos */
  artistName?: string;
}

// The photos of an artist's work, shown on their page. Unlike the other fields of the form,
// photos are saved the moment they are uploaded or removed (Save and Cancel don't apply to them).
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

  const uploadId = useId();
  const upload = async (files: FileList | null) => {
    if (!files || nailistId === null) return;
    const chosen = Array.from(files);

    if (chosen.length > MAX_IMAGES - images.length) {
      toast.show("error", "Too many photos", `${upperFirst(who)} can have up to ${MAX_IMAGES} photos. Remove some before uploading more.`);
      return;
    }

    setBusy(true);
    try {
      const token = tokenFetcher ? await tokenFetcher() : null;
      // One at a time, so each photo gets the next position
      for (const file of chosen) {
        const uploaded = await uploadImage(file, "nailists", token, clerkId, PHOTO_UPLOAD_OPTIONS);
        const created = await addNailistGalleryImage(nailistId, uploaded.imageUrl, token, clerkId);
        setImages((prev) => [...prev, { id: created.id, nailist_id: nailistId, image_url: uploaded.imageUrl, position: prev.length + 1 }]);
        onChanged?.();
      }
    } catch (error) {
      console.error("Failed to add artist photos:", error);
      toast.show("error", "Photos not added", `We couldn't add all the photos for ${who}. The ones shown above were saved. Please check that they are image files and try again.`);
    } finally {
      setBusy(false);
    }
  };

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
        <p className="text-[13px] text-gray-red">Save the artist first, then you can add photos of their work.</p>
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
                  <Button
                    variant="bare"
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => remove(image)}
                    disabled={busy}
                    className="flex items-center justify-center w-7 h-7 shrink-0"
                  >
                    <XIcon size={28} className="text-crimson" />
                  </Button>
                )}
              </div>
            ))}
            {images.length === 0 && !isEditing && (
              <p className="text-[13px] text-gray-red">No photos yet. Press Edit to add some.</p>
            )}
          </div>

          {isEditing && images.length < MAX_IMAGES && (
            <div className="mt-3">
              <DropArea
                id={uploadId}
                uploading={busy}
                label="Add photos"
                hint="PNG, JPG or WebP. Click, or drop them here. Photos are saved as soon as they are uploaded or removed."
                onFiles={(files) => void upload(files)}
                input={
                  <input
                    id={uploadId}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    multiple
                    disabled={busy}
                    className="sr-only"
                    onChange={async (e) => {
                      await upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
