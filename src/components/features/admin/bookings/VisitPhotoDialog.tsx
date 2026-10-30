import { useId } from "react";
import { Button } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { useVisitPhoto } from "@/hooks/admin/useVisitPhoto";
import VisitPhotoDropzone from "./VisitPhotoDropzone";

interface VisitPhotoDialogProps {
  appointmentId: number;
  open: boolean;
  onClose: () => void;
  /** After the photo is uploaded */
  onDone?: () => void;
  /** What messages call the visit, e.g. "Audit Tester's Gel Manicure visit" */
  label?: string;
}

// The visit's one nail photo, added after it was completed: picked, previewed, then uploaded to the
// artist's gallery (a new one replaces the visit's earlier photo)
export default function VisitPhotoDialog({ appointmentId, open, onClose, onDone, label }: VisitPhotoDialogProps) {
  const photo = useVisitPhoto(
    appointmentId,
    () => {
      onDone?.();
      onClose();
    },
    label,
  );
  const id = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a visit photo"
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={photo.busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void photo.upload()} disabled={!photo.file} loading={photo.busy}>
            Upload photo
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-red">
          One photo, up to {photo.maxMb} MB. It&apos;s made smaller before it&apos;s saved, and goes first in the artist&apos;s gallery.
        </p>
        <VisitPhotoDropzone id={`${id}-photo`} file={photo.file} preview={photo.preview} error={photo.error} maxMb={photo.maxMb} disabled={photo.busy} onChoose={photo.choose} />
      </div>
    </Dialog>
  );
}
