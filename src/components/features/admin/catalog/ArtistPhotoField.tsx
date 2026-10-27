import { useId } from "react";
import { X as XIcon } from "lucide-react";
import { SectionHeader } from "@/components/molecules";
import { Button } from "@/components/atoms";
import { DropArea } from "@/components/features/admin/cms/fields";

type ArtistPhotoFieldProps = {
  image: string;
  isEditing: boolean;
  isUploading: boolean;
  onPreview: (imageUrl: string) => void;
  onRemove: () => void;
  onUpload: (file: File) => Promise<void>;
};

// The artist editor's Photo: the photo's file name (opens a preview), or an upload while editing
const ArtistPhotoField = ({ image, isEditing, isUploading, onPreview, onRemove, onUpload }: ArtistPhotoFieldProps) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader size="label" title="Photo" />

      {image && (
        <div className="flex items-center justify-between w-full min-h-9 bg-milk rounded-md px-3 py-1 mt-3 mb-1 overflow-visible border border-crimson-light">
          <Button
            variant="bare"
            type="button"
            onClick={() => onPreview(image)}
            className="min-w-0 flex-1 cursor-pointer text-left text-[13px] leading-none truncate text-gray-red hover:underline"
          >
            {image.split("/").pop()}
          </Button>

          {isEditing && (
            <Button
              variant="bare"
              type="button"
              onClick={onRemove}
              disabled={isUploading}
              className="flex items-center justify-center w-7 h-7 shrink-0"
            >
              <XIcon size={28} className="text-crimson" />
            </Button>
          )}
        </div>
      )}

      {isEditing && !image && (
        <div className="mt-3">
          <DropArea
            id={id}
            uploading={isUploading}
            label="Add a photo"
            onFile={(file) => file && void onUpload(file)}
            input={
              <input
                id={id}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                disabled={isUploading}
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  await onUpload(file);
                  e.target.value = "";
                }}
              />
            }
          />
        </div>
      )}
    </div>
  );
};

export default ArtistPhotoField;
