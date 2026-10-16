import { useId } from "react";
import { ImageUp } from "lucide-react";
import { Button } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { useVisitPhoto } from "@/hooks/admin/useVisitPhoto";

interface VisitPhotoDialogProps {
  appointmentId: number;
  open: boolean;
  onClose: () => void;
  /** After the photo is uploaded */
  onDone?: () => void;
}

// The visit's one nail photo, added after it was completed: picked, previewed, then uploaded to the
// artist's gallery (a new one replaces the visit's earlier photo)
export default function VisitPhotoDialog({ appointmentId, open, onClose, onDone }: VisitPhotoDialogProps) {
  const photo = useVisitPhoto(appointmentId, () => {
    onDone?.();
    onClose();
  });
  const id = useId();

  return (
    <Dialog open={open} onClose={onClose} title="Add a visit photo" size="md">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-red">
          One photo, up to {photo.maxMb} MB. It&apos;s made smaller before it&apos;s saved, and goes first in the artist&apos;s gallery.
        </p>
        <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-crimson-light bg-crimson-light/10 p-4">
          <label htmlFor={`${id}-photo`} className="flex items-center gap-2 text-[13px] font-bold text-gray-red">
            <ImageUp size={16} aria-hidden="true" className="text-crimson-ink" />
            Nail photo
          </label>
          <input
            id={`${id}-photo`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={photo.busy}
            onChange={(e) => photo.choose(e.target.files?.[0] ?? null)}
            className="w-full min-w-0 text-sm text-gray-red file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-crimson file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-on-crimson"
          />
        </div>
        {photo.preview && (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked file
          <img src={photo.preview} alt="The photo to upload" className="max-h-56 w-auto self-start rounded-xl border border-crimson-light/60 object-contain" />
        )}
        {photo.error && (
          <p role="alert" className="text-sm font-bold text-danger-ink">
            {photo.error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void photo.upload()} disabled={!photo.file} loading={photo.busy}>
            Upload photo
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={photo.busy}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
