import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { isApiAdmin } from "@/server/auth";
import ForgetPublicContent from "@/components/providers/ForgetPublicContent";

// Search engines must not list the admin screens
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

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

  if (user.publicMetadata?.role !== "admin" && !(await isApiAdmin("admin layout"))) redirect("/");

  return (
    <>
      <ForgetPublicContent />
      {children}
    </>
  );
}
