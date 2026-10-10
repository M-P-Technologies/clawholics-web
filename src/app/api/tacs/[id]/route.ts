import { deleteTac, updateTac } from "@/server/handlers/catalog";

export const dynamic = "force-dynamic";

export const PUT = updateTac;
export const DELETE = deleteTac;
