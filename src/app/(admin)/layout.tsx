import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/server/auth";
import { nextApiEnabled } from "@/server/worker";

// Every admin screen needs a signed-in admin. It is checked on the server before the screen
// renders; the API still enforces the role on every admin request.
//
// An admin has users.role = "admin" (what the admin API checks) or Clerk
// publicMetadata.role = "admin". The client screens send a user here when either
// says admin, so this check must accept both: checking only one made them redirect back and
// forth forever when the two disagreed.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (user.publicMetadata?.role !== "admin" && !(await isApiAdmin())) redirect("/");

  return children;
}

// Until the cutover (API_BACKEND=worker) the roles live in D1 behind the Worker, so only
// Clerk's role is checked; a failed lookup also falls back to it.
async function isApiAdmin() {
  if (!nextApiEnabled()) return false;
  try {
    return await isAdmin();
  } catch (error) {
    console.error("[admin layout] role lookup failed:", error);
    return false;
  }
}
