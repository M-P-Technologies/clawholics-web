import { getProfile, updateProfile } from "@/server/handlers/users";

export const dynamic = "force-dynamic";

export const GET = getProfile;
export const PUT = updateProfile;
