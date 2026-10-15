import "server-only";

// Uploads say what type they are (file.type), but that's whatever the sender claims. Before an
// image is stored, its first bytes are checked against the real signatures of the three types the
// site accepts, so a script or HTML file sent as "image/png" is refused.

const starts = (bytes: Uint8Array, signature: (number | null)[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((b, i) => b === null || bytes[offset + i] === b);

const SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (b) => starts(b, [0xff, 0xd8, 0xff]),
  "image/png": (b) => starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  // "RIFF", four bytes of size, then "WEBP"
  "image/webp": (b) => starts(b, [0x52, 0x49, 0x46, 0x46]) && starts(b, [0x57, 0x45, 0x42, 0x50], 8),
};

/** True when the bytes really are an image of this type (JPG, PNG or WEBP) */
export function isImageOfType(bytes: Uint8Array, type: string): boolean {
  return SIGNATURES[type]?.(bytes) ?? false;
}

/** The file's bytes, or null when they aren't really the image type it claims */
export async function imageBytes(file: File): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return isImageOfType(bytes, file.type) ? bytes : null;
}

export const NOT_AN_IMAGE = "That file isn't a valid JPG, PNG or WEBP image.";
