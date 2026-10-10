import { deleteFaq, updateFaq } from "@/server/handlers/catalog";

export const dynamic = "force-dynamic";

export const PUT = updateFaq;
export const DELETE = deleteFaq;
