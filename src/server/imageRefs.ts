import "server-only";
import { IMAGE_SOURCES, imageFileName } from "../lib/imageSources";
import { getSql } from "./db";
import { deleteObject, publicBaseUrl } from "./r2";

// The same image address can be stored in several places (a visit's photo is also in its artist's
// gallery, and an admin can pick it for a service, the carousel or the home strip), so a file is
// deleted only once nothing stores it any more. Deleting is a saving, never a requirement: a failure
// is logged and scripts/r2-orphans.mjs finds whatever was left.

/** The R2 key of an address in our bucket; null for any other (another host, the old Worker's) */
export function r2KeyOf(address: string | null | undefined): string | null {
  const base = publicBaseUrl();
  if (!address || !address.startsWith(`${base}/`)) return null;
  const key = address.slice(base.length + 1).split(/[?#]/)[0];
  return /\.(?:webp|jpe?g|png)$/i.test(key) ? key : null;
}

/** Whether anything still stores a file of this name */
export async function isImageReferenced(fileName: string): Promise<boolean> {
  const sql = getSql();
  for (const { table, column } of IMAGE_SOURCES) {
    const [found] = await sql`select 1 from ${sql(table)} where strpos(${sql(column)}, ${fileName}) > 0 limit 1`;
    if (found) return true;
  }
  return false;
}

/** Deletes the files of these addresses that nothing stores any more. Run it after the change that
 *  dropped them has been saved, so what it checks is what remains. Never throws. */
export async function releaseImages(addresses: (string | null | undefined)[]): Promise<void> {
  try {
    const keys = new Set<string>();
    for (const address of addresses) {
      const key = r2KeyOf(address);
      if (key) keys.add(key);
    }
    for (const key of keys) {
      try {
        if (!(await isImageReferenced(imageFileName(key)))) await deleteObject(key);
      } catch (error) {
        console.error(`[image cleanup] could not release ${key}:`, error);
      }
    }
  } catch (error) {
    console.error("[image cleanup]", error);
  }
}
