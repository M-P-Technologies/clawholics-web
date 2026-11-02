import "server-only";
import sharp from "sharp";

// Photos clients and admins upload are stored once, as WEBP at most 1600px on the long side, however
// big the original was: a phone photo is 3 to 6 MB and the site never shows it larger than that.
// Other uploads (the admin screens') already arrive as WEBP from the browser.

const LONG_SIDE = 1600;
const QUALITY = 80;

/** The image as a smaller WEBP, turned upright by its camera rotation and without its metadata (a
 *  review photo's location included). Throws when the bytes can't be decoded. */
export async function toWebp(bytes: Uint8Array): Promise<Uint8Array> {
  const out = await sharp(bytes, { failOn: "error" })
    .rotate()
    .resize({ width: LONG_SIDE, height: LONG_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  return new Uint8Array(out);
}
