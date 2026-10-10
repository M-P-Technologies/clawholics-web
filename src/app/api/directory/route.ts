import { createDirectoryUser, listDirectory } from "@/server/handlers/users";

export const dynamic = "force-dynamic";

export const GET = listDirectory;
export const POST = createDirectoryUser;
