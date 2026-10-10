import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// R2 through its S3-compatible API (Vercel has no Worker binding). Objects keep their keys
// and stay public at R2_PUBLIC_URL, so image URLs already stored in the database don't change.

let client: S3Client | undefined;

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Newer SDKs add CRC checksum headers by default; R2 asks for them only when required
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

const bucket = () => {
  const name = process.env.R2_BUCKET;
  if (!name) throw new Error("R2_BUCKET is not set");
  return name;
};

/** Where the bucket is served publicly. Required: a stored URL without it would point nowhere. */
export function publicBaseUrl() {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) throw new Error("R2_PUBLIC_URL is not set");
  return base;
}

const sanitizeFileName = (fileName: string) =>
  fileName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "");

/** Same key format as the Worker's createWebpImageKey: `<folder>/<time>-<uuid>-<name>.webp`. */
export function createWebpImageKey(folder: string, fileName: string) {
  const safeFolder = folder.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9/_-]/g, "");
  const safeName = sanitizeFileName(fileName).replace(/\.[^/.]+$/, "");
  return `${safeFolder}/${Date.now()}-${crypto.randomUUID()}-${safeName}.webp`;
}

/** `<folder>/<time>-<uuid>-<name>` keeping the file's extension, for uploads that aren't WEBP. */
export function createImageKey(folder: string, fileName: string) {
  return `${folder}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await getClient().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
}

export async function deleteObject(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
