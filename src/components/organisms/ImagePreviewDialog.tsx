import { X as XIcon } from "lucide-react";
import React from "react";
import { Button } from "@/components/atoms";
import Dialog from "./Dialog";

type ImagePreviewDialogProps = {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
};

const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  imageUrl,
  title = "Image Preview",
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
        <div className="flex items-center justify-between gap-4">
          <h3 className="truncate text-[20px] font-bold text-gray-red sm:text-[20px]">
            {title}
          </h3>

          <Button
            variant="bare"
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-red"
            aria-label="Close image preview"
          >
            <XIcon size={28} className="text-crimson" />
          </Button>
        </div>
      }
    >
      <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-xl bg-crimson-light/15">
        <img
          src={imageUrl ?? undefined}
          alt="Preview"
          className="max-h-[75vh] w-full object-contain"
        />
      </div>
    </Dialog>
  );
};

export default ImagePreviewDialog;
