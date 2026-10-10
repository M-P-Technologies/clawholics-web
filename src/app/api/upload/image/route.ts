import { requireAdmin, requireUser } from "@/server/auth";
import { createWebpImageKey, deleteObject, publicBaseUrl, putObject } from "@/server/r2";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

// Port of the Worker's /upload/image. Images are compressed to WEBP in the browser
// (uploadService.ts), so they stay far below Vercel's request body limit and go through here
// rather than to R2 directly, which keeps the type and size checks on the server.
// Stricter than the Worker: uploading needs a signed-in user and deleting needs an admin.

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_COMPRESSED_SIZE = 500 * 1024;

export const POST = ported(async (req) => {
  const requester = await requireUser();
  if (requester instanceof Response) return requester;

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") || "uploads");

  if (!file || typeof file === "string") {
    return Response.json({ message: "No image file provided" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return Response.json({ message: "Invalid image type. Only JPG, PNG, and WEBP are allowed." }, { status: 400 });
  }
  if (file.size > MAX_COMPRESSED_SIZE) {
    return Response.json({ message: "Image must be 500KB or smaller after compression." }, { status: 400 });
  }
  if (file.type !== "image/webp") {
    return Response.json({ message: "Image must be converted to WEBP before upload." }, { status: 400 });
  }

  const key = createWebpImageKey(folder, file.name);
  const imageUrl = `${publicBaseUrl()}/${key}`;
  await putObject(key, new Uint8Array(await file.arrayBuffer()), "image/webp");

  return Response.json({ message: "Image uploaded successfully", key, imageUrl });
});

export const DELETE = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const body = (await req.json().catch(() => ({}))) as { key?: string; imageUrl?: string };
  let key = body.key;
  const base = publicBaseUrl();
  if (!key && body.imageUrl && base && body.imageUrl.startsWith(`${base}/`)) {
    key = body.imageUrl.slice(base.length + 1);
  }
  if (!key) return Response.json({ message: "Missing image key" }, { status: 400 });

  await deleteObject(key);
  return Response.json({ message: "Image deleted successfully", key });
});
