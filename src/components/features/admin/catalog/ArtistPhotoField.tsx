import { Upload as UploadIcon, X as XIcon } from "lucide-react";
import { SectionHeader } from "@/components/molecules";
import { Button } from "@/components/atoms";

type ArtistPhotoFieldProps = {
  image: string;
  isEditing: boolean;
  isUploading: boolean;
  onPreview: (imageUrl: string) => void;
  onRemove: () => void;
  onUpload: (file: File) => Promise<void>;
};

// The artist editor's Photo: the photo's file name (opens a preview), or an upload while editing
const ArtistPhotoField = ({ image, isEditing, isUploading, onPreview, onRemove, onUpload }: ArtistPhotoFieldProps) => (
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
      <label
        className={`flex flex-col items-center justify-center w-full mt-3 ${
          !isUploading ? "cursor-pointer" : "cursor-not-allowed"
        }`}
      >
        <div className="flex items-center justify-center w-10.5 h-10.5 rounded-sm bg-crimson/15 text-gray-red">
          <UploadIcon size={28} className="text-crimson" />
        </div>

        <p className="text-[13px] text-gray-red">
          {isUploading
            ? "Uploading photo..."
            : "Click here to upload a photo"}
        </p>

        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          disabled={isUploading}
          className="border border-crimson-light focus:border-crimson hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            await onUpload(file);
            e.target.value = "";
          }}
        />
      </label>
    )}
  </div>
);

export default ArtistPhotoField;
