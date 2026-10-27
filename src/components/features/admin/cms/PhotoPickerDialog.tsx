import { Dialog } from "@/components/organisms";
import WorkPhotoPicker from "@/components/features/admin/cms/WorkPhotoPicker";
import type { WorkPhoto } from "@/hooks/admin/useArtistWorkPhotos";

interface PhotoPickerDialogProps {
  open: boolean;
  onClose: () => void;
  choices: WorkPhoto[];
  /** URLs already used, left out of the grid */
  taken: string[];
  loading?: boolean;
  emptyText?: string;
  /** Called with the photo's address; the dialog closes after it */
  onPick: (url: string) => void;
}

// "Choose a photo": a grid of photos already in the database (added when a visit is completed), so
// nothing is uploaded twice. One tap picks a photo and closes it.
export default function PhotoPickerDialog({ open, onClose, choices, taken, loading, emptyText, onPick }: PhotoPickerDialogProps) {
  return (
    <Dialog open={open} title="Choose a photo" onClose={onClose}>
      <WorkPhotoPicker
        choices={choices}
        taken={taken}
        loading={loading}
        emptyText={emptyText}
        title=""
        onPick={(url) => {
          onPick(url);
          onClose();
        }}
      />
    </Dialog>
  );
}
