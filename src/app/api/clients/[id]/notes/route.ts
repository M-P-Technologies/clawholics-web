import { addClientNote, listClientNotes } from "@/server/handlers/clients";

export const dynamic = "force-dynamic";

export const GET = listClientNotes;
export const POST = addClientNote;
