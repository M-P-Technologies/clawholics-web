import { Upload as UploadIcon, X as XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addNailistGalleryImage,
  deleteNailistGalleryImage,
  fetchNailistGallery,
  type NailistGalleryImage,
} from "../../services/nailistService";
import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "../../services/uploadService";
import Button from "../ui/Button";
import { useToast } from "../ui/ToastProvider";

const MAX_IMAGES = 10;

interface NailArtistGalleryProps {
  /** The artist these photos belong to; null while the artist hasn't been created yet */
  nailistId: number | null;
  isEditing: boolean;
  tokenFetcher?: () => Promise<string | null>;
  clerkId?: string | null;
  onPreview: (url: string) => void;
}

// The photos of an artist's work, shown on their page. Unlike the other fields of the form,
// photos are saved the moment they are uploaded or removed (Save and Cancel don't apply to them).
export default function NailArtistGallery({ nailistId, isEditing, tokenFetcher, clerkId, onPreview }: NailArtistGalleryProps) {
  const toast = useToast();
  const [images, setImages] = useState<NailistGalleryImage[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (nailistId === null) return;
    let cancelled = false;

    fetchNailistGallery(nailistId)
      .then((data) => {
        if (cancelled) return;
        setImages([...data].sort((a, b) => a.position - b.position));
        setLoadFailed(false);
      })
      .catch(() => !cancelled && setLoadFailed(true));

    return () => {
      cancelled = true;
    };
  }, [nailistId]);

  const upload = async (files: FileList | null) => {
    if (!files || nailistId === null) return;
    const chosen = Array.from(files);

    if (chosen.length > MAX_IMAGES - images.length) {
      toast.show("error", "Too many photos", `An artist can have up to ${MAX_IMAGES} photos. Remove some before uploading more.`);
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
      }
    } catch (error) {
      console.error("Failed to add artist photos:", error);
      toast.show("error", "Photos not added", "We couldn't add all the photos. The ones shown above were saved. Please check that they are image files and try again.");
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
    } catch (error) {
      console.error("Failed to remove artist photo:", error);
      toast.show("error", "Photo not removed", "We couldn't remove that photo, so it is still in the gallery. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-crimson-light/15 px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[17px] tracking-wide text-gray-red">
          Photos of their work{nailistId !== null && ` (${images.length}/${MAX_IMAGES})`}
        </h3>
      </div>
      <div className="w-full h-[1.5px] bg-crimson mb-4" />

      {nailistId === null ? (
        <p className="text-[13px] text-gray-red/80">Save the artist first, then you can add photos of their work.</p>
      ) : loadFailed ? (
        <p role="alert" className="text-[13px] text-danger">
          We couldn&apos;t load this artist&apos;s photos. Please close and reopen the artist to try again.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                className="flex items-center justify-between w-full min-h-[36px] bg-milk rounded-md px-4 py-1 overflow-visible border border-crimson-light"
              >
                <Button
                  variant="bare"
                  type="button"
                  onClick={() => onPreview(image.image_url)}
                  className="min-w-0 flex-1 cursor-pointer text-left text-[16px] leading-none truncate text-gray-red hover:underline"
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
              <p className="text-[13px] text-gray-red/80">No photos yet. Press Edit to add some.</p>
            )}
          </div>

          {isEditing && images.length < MAX_IMAGES && (
            <label className={`flex flex-col items-center justify-center w-full mt-4 ${busy ? "cursor-not-allowed" : "cursor-pointer"}`}>
              <div className="flex items-center justify-center w-10.5 h-10.5 rounded-sm bg-crimson/15 text-gray-red">
                <UploadIcon size={28} className="text-crimson" />
              </div>

              <p className="text-[13px] text-gray-red">{busy ? "Working..." : "Click here to upload photos"}</p>
              <p className="text-[12px] text-gray-red/70">Photos are saved as soon as they are uploaded or removed.</p>

              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                disabled={busy}
                className="hidden"
                onChange={async (e) => {
                  await upload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </>
      )}
    </div>
  );
}
