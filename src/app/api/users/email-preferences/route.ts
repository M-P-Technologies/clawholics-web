import { getEmailPreferences, updateEmailPreferences } from "@/server/handlers/emailPreferences";

export const dynamic = "force-dynamic";

export const GET = getEmailPreferences;
export const PUT = updateEmailPreferences;
