import { ExternalLink, Image as ImageIcon, X as XIcon } from "lucide-react";
import React from "react";
import { Button } from "@/components/atoms";
import Dialog from "./Dialog";

type ImagePreviewDialogProps = {
  imageUrl: string | null;
  title?: string;
  /** The image's alt text */
  alt?: string;
  onClose: () => void;
};

// A photo or screenshot, big: drawn like the brand's dialogs (the title in the display font with
// its icon in a soft pink circle, the round close button), the image framed like a card, and a
// way to open it full size to zoom in (a receipt's small print).
const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  imageUrl,
  title = "Image Preview",
  alt = "Preview",
  onClose,
}) => {
  return (
    <Dialog
      open={!!imageUrl}
      onClose={onClose}
      title={title}
      placement="sheet"
      size="2xl"
      header={
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-3 font-display text-xl font-normal text-gray-red">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/40 text-berry">
              <ImageIcon size={18} strokeWidth={1.75} />
            </span>
            <span className="truncate">{title}</span>
          </h2>

          <Button
            variant="bare"
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-gray-red hover:bg-crimson-light/40 hover:text-gray-red"
            aria-label="Close image preview"
          >
            <XIcon size={20} aria-hidden="true" />
          </Button>
        </div>
      }
      footer={
        imageUrl ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" href={imageUrl}>
              <ExternalLink size={14} aria-hidden="true" />
              Open full size
              <span className="sr-only"> (opens in a new tab)</span>
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-2xl border border-crimson-light/40 bg-pearl p-2 shadow-petal">
        <img src={imageUrl ?? undefined} alt={alt} className="max-h-[calc(70vh-1rem)] w-full rounded-xl object-contain" />
      </div>
    </Dialog>
  );
};

export default ImagePreviewDialog;
