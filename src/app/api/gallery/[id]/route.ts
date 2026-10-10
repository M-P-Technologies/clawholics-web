import { deleteGalleryImage, updateGalleryImage } from "@/server/handlers/catalog";

export const dynamic = "force-dynamic";

export const PUT = updateGalleryImage;
export const DELETE = deleteGalleryImage;
