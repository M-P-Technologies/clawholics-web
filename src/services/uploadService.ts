import imageCompression from "browser-image-compression";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export type UploadFolder =
  | "carousel"
  | "content"
  | "services"
  | "service-gallery"
  | "nailists"
  | "uploads";

const MAX_ORIGINAL_IMAGE_SIZE_MB = 8;
const MAX_ORIGINAL_IMAGE_SIZE_BYTES = MAX_ORIGINAL_IMAGE_SIZE_MB * 1024 * 1024;

const MAX_COMPRESSED_IMAGE_SIZE_KB = 130;

export type UploadOptions = {
  maxWidthOrHeight?: number;
  maxSizeKB?: number;
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const getWebpFileName = (fileName: string) => {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExtension}.webp`;
};

export const compressImageToWebp = async (
  file: File,
  options: UploadOptions = {}
): Promise<File> => {
  const maxSizeKB = options.maxSizeKB ?? MAX_COMPRESSED_IMAGE_SIZE_KB;
  const compressedBlob = await imageCompression(file, {
    maxSizeMB: maxSizeKB / 1024,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1000,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.65,
    maxIteration: 20,
  });

  return new File([compressedBlob], getWebpFileName(file.name), {
    type: "image/webp",
    lastModified: Date.now(),
  });
};

export const uploadImage = async (
  file: File,
  folder: UploadFolder = "uploads",
  token?: string | null,
  clerkId?: string | null,
  options?: UploadOptions
): Promise<{ key: string; imageUrl: string }> => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed");
  }

  if (file.size > MAX_ORIGINAL_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Original image must be ${MAX_ORIGINAL_IMAGE_SIZE_MB}MB or smaller`
    );
  }

  const compressedFile = await compressImageToWebp(file, options);
  const maxSizeKB = options?.maxSizeKB ?? MAX_COMPRESSED_IMAGE_SIZE_KB;

  if (compressedFile.size > maxSizeKB * 1024) {
    throw new Error(
      `Compressed image is still larger than ${maxSizeKB}KB. Please upload a smaller image.`
    );
  }

  const formData = new FormData();

  formData.append("file", compressedFile);
  formData.append("folder", folder);

  const res = await fetch(`${API_BASE_URL}/upload/image`, {
    method: "POST",
    headers: {
      "x-clawholics-origin": "frontend",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(clerkId ? { clerk_id: clerkId } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.error) {
    if (res.status === 403) window.location.href = "/";
    throw new Error(data?.error || data?.message || "Failed to upload image");
  }

  return {
    key: data.key,
    imageUrl: data.imageUrl,
  };
};
