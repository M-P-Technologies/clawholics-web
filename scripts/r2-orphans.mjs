// Finds the images in the R2 bucket that nothing in the database refers to (left behind by deleted
// or replaced photos, failed saves, or before they were cleaned up on delete), and deletes them
// when asked. Read-only unless --delete is passed.
//
//   npm run r2:orphans                      (dry run: counts, sizes and a sample, nothing deleted)
//   npm run r2:orphans -- --delete          (deletes what the dry run listed)
//
// Options:  --min-age-days=3   only files older than this (default 3: a photo picked in the admin
//                              is only referenced once its form is saved)
//           --force            delete even when more than half of the images look unused (that
//                              usually means the database is the wrong one, not that they are)
//
// Needs, in .env.local: DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
// Deleting from R2 can't be undone: read the dry run first, and run it against the live database
// (the one whose images the bucket holds).

import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";
import { IMAGE_SOURCES, findOrphans, referencedFileNames } from "../src/lib/imageSources.ts";

const args = process.argv.slice(2);
const remove = args.includes("--delete");
const force = args.includes("--force");
const minAgeDays = Number(args.find((a) => a.startsWith("--min-age-days="))?.split("=")[1] ?? 3);
if (!Number.isFinite(minAgeDays) || minAgeDays < 0) {
  console.error("--min-age-days must be a number of days, 0 or more.");
  process.exit(1);
}

for (const name of ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
  if (!process.env[name]) {
    console.error(`${name} is not set (run with: node --env-file=.env.local scripts/r2-orphans.mjs)`);
    process.exit(1);
  }
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

try {
  // Every image the database mentions
  const texts = [];
  for (const { table, column } of IMAGE_SOURCES) {
    const rows = await sql`select ${sql(column)} as text from ${sql(table)} where ${sql(column)} is not null`;
    texts.push(...rows.map((row) => row.text));
  }
  const referenced = referencedFileNames(texts);

  // Everything in the bucket
  const objects = [];
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, ContinuationToken: token }));
    for (const o of page.Contents ?? []) objects.push({ key: o.Key, size: o.Size ?? 0, lastModified: o.LastModified ?? new Date() });
    token = page.NextContinuationToken;
  } while (token);

  const images = objects.filter((o) => /\.(?:webp|jpe?g|png)$/i.test(o.key));
  const orphans = findOrphans(objects, referenced, minAgeDays * 24 * 60 * 60 * 1000);
  const total = (list) => list.reduce((sum, o) => sum + o.size, 0);

  console.log(`Bucket: ${objects.length} files (${mb(total(objects))}), ${images.length} of them images (${mb(total(images))}).`);
  console.log(`Database: ${referenced.size} different image files mentioned.`);
  console.log(`Unused images older than ${minAgeDays} day(s): ${orphans.length} (${mb(total(orphans))}).`);

  const byFolder = new Map();
  for (const o of orphans) {
    const folder = o.key.includes("/") ? o.key.slice(0, o.key.indexOf("/")) : "(root)";
    const entry = byFolder.get(folder) ?? { count: 0, size: 0 };
    byFolder.set(folder, { count: entry.count + 1, size: entry.size + o.size });
  }
  for (const [folder, { count, size }] of [...byFolder].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`  ${folder}/  ${count} files, ${mb(size)}`);
  }
  for (const o of orphans.slice(0, 15)) console.log(`  e.g. ${o.key}  (${(o.size / 1024).toFixed(0)} KB, ${o.lastModified.toISOString().slice(0, 10)})`);

  if (!remove) {
    console.log(orphans.length ? "\nDry run: nothing was deleted. Run again with --delete to delete these." : "\nNothing to delete.");
  } else if (orphans.length === 0) {
    console.log("\nNothing to delete.");
  } else if (referenced.size === 0 || (images.length > 0 && orphans.length / images.length > 0.5 && !force)) {
    console.error("\nRefusing to delete: more than half of the images look unused, or the database mentions none. That usually means this is not the database the bucket belongs to. Check DATABASE_URL, or pass --force if it is right.");
    process.exitCode = 1;
  } else {
    let deleted = 0;
    for (let i = 0; i < orphans.length; i += 1000) {
      const batch = orphans.slice(i, i + 1000);
      const result = await s3.send(new DeleteObjectsCommand({ Bucket: process.env.R2_BUCKET, Delete: { Objects: batch.map((o) => ({ Key: o.key })), Quiet: true } }));
      deleted += batch.length - (result.Errors?.length ?? 0);
      for (const error of result.Errors ?? []) console.error(`  could not delete ${error.Key}: ${error.Message}`);
    }
    console.log(`\nDeleted ${deleted} of ${orphans.length} files.`);
  }
} finally {
  await sql.end();
}
