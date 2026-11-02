// Where an uploaded image's address can be stored, and how to tell which file an address names.
// Pure (no server imports), so the server's cleanup and the scripts/r2-orphans.mjs sweep share
// one list. A new column that holds an image address must be added here, or its file would look
// unused and be deleted.

/** Columns that hold an image address, or text that may hold addresses (JSON, HTML) */
export const IMAGE_SOURCES: readonly { table: string; column: string }[] = [
  { table: "content", column: "value" }, // home strip and offers (JSON), photos, About/legal HTML
  { table: "site_settings", column: "value" },
  { table: "faqs", column: "answer" },
  { table: "terms_and_conditions", column: "content" },
  { table: "home_carousel", column: "image_url" },
  { table: "service_categories", column: "image" },
  { table: "services", column: "image" },
  { table: "service_gallery", column: "image_url" },
  { table: "nailists", column: "image" },
  { table: "nailist_gallery", column: "image_url" },
  { table: "visit_completions", column: "photo_url" },
  { table: "reviews", column: "photo_url" },
  { table: "payment_proofs", column: "image_url" },
];

/** The file names of images found inside a text: `1730000000-<uuid>-name.webp`, `<uuid>.jpg`. Files
 *  are matched by name, not address: a name holds a uuid, so it is unique, and the same file may be
 *  stored under another host (the old Worker's) in older rows. */
export const IMAGE_FILE = /[A-Za-z0-9._-]+\.(?:webp|jpe?g|png)/gi;

/** The file name of an image address or key (the last part, without a query) */
export const imageFileName = (addressOrKey: string) => addressOrKey.split(/[?#]/)[0].split("/").pop() ?? "";

/** The lower-case file names of every image mentioned in these texts (column values) */
export function referencedFileNames(texts: Iterable<string | null | undefined>): Set<string> {
  const names = new Set<string>();
  for (const text of texts) {
    for (const match of text?.matchAll(IMAGE_FILE) ?? []) names.add(match[0].toLowerCase());
  }
  return names;
}

export interface StoredObject {
  key: string;
  size: number;
  lastModified: Date;
}

/** The stored images nothing refers to: an image file (never another kind of file), older than
 *  `minAgeMs` (a photo uploaded in the admin only gets its address stored when the form is saved),
 *  whose name no column mentions. */
export function findOrphans(objects: StoredObject[], referenced: Set<string>, minAgeMs: number, now = Date.now()): StoredObject[] {
  return objects.filter(
    (object) =>
      /\.(?:webp|jpe?g|png)$/i.test(object.key) &&
      now - object.lastModified.getTime() >= minAgeMs &&
      !referenced.has(imageFileName(object.key).toLowerCase()),
  );
}
