import { X as XIcon } from "lucide-react";
import React, { useEffect } from "react";
import Button from "../ui/Button";

type ImagePreviewModalProps = {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
};

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  title = "Image Preview",
  onClose,
}) => {
  useEffect(() => {
    if (!imageUrl) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-gray-red/40 px-4 py-8 drawer-backdrop max-sm:p-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-milk p-4 shadow-lg sm:p-5 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none flex flex-col gap-2"
        onClick={(event) => event.stopPropagation()}
      >
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

        <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-xl bg-crimson-light/15">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-[75vh] w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;