import { getProfile, updateContactDetails, updateProfile } from "@/server/handlers/users";

export const dynamic = "force-dynamic";

export const GET = getProfile;
export const PUT = updateProfile;
export const PATCH = updateContactDetails;
