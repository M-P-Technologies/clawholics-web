import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "../auth";
import { ported } from "../worker";

// GET /directory/profiles (admin only): for the directory cards, each Clerk user's photo (only
// one they uploaded, not Clerk's placeholder), when they joined and when they last signed in, by
// Clerk id. /directory itself keeps the Worker's columns, so these come separately. A Clerk
// failure answers with no profiles (the cards then show initials), never an error.

const PAGE = 500; // Clerk's largest page

const iso = (ms: number | null | undefined) => (typeof ms === "number" ? new Date(ms).toISOString() : null);

export const listDirectoryProfiles = ported(async () => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const profiles: Record<string, { imageUrl: string | null; joinedAt: string | null; lastSignInAt: string | null }> = {};
  try {
    const client = await clerkClient();
    for (let offset = 0; ; offset += PAGE) {
      const { data } = await client.users.getUserList({ limit: PAGE, offset });
      for (const user of data) {
        profiles[user.id] = {
          imageUrl: user.hasImage ? user.imageUrl : null,
          joinedAt: iso(user.createdAt),
          lastSignInAt: iso(user.lastSignInAt),
        };
      }
      if (data.length < PAGE) break;
    }
  } catch (error) {
    console.error("[clerk] could not list users for the directory cards:", error);
    return Response.json({ profiles: {} });
  }
  return Response.json({ profiles });
});
