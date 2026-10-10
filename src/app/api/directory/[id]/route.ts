import { deleteDirectoryUser, updateDirectoryUser } from "@/server/handlers/users";

export const dynamic = "force-dynamic";

export const PUT = updateDirectoryUser;
export const DELETE = deleteDirectoryUser;
