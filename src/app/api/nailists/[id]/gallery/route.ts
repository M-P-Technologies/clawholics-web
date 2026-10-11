import { addGalleryImage, getGallery } from "@/server/handlers/nailists";

export const dynamic = "force-dynamic";

export const GET = getGallery;
export const POST = addGalleryImage;
