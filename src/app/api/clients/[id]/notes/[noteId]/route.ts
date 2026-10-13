import { deleteClientNote, updateClientNote } from "@/server/handlers/clients";

export const dynamic = "force-dynamic";

export const PUT = updateClientNote;
export const DELETE = deleteClientNote;
