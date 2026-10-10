import { deleteCategory, updateCategory } from "@/server/handlers/catalog";

export const dynamic = "force-dynamic";

export const PUT = updateCategory;
export const DELETE = deleteCategory;
