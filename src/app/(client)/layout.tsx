import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import ClientShell from "@/components/features/client/shell/ClientShell";
import MyAccountProvider from "@/components/features/client/shell/MyAccountProvider";
import { ClientOnly } from "@/components/guards/ClientOnly";
import { OnboardingGate } from "@/components/guards/OnboardingGate";
import { isAdmin } from "@/server/auth";
import { nextApiEnabled } from "@/server/worker";

// The client app is personal: search engines must not list it
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Every screen under /my needs a signed-in client, checked on the server first. Admins have no
// client profile and go to their dashboard (either role counts, as in the admin layout). In the
// browser, OnboardingGate sends a client without a finished profile to /onboarding, and
// MyAccountProvider loads the account once for every tab.
// Router state (booking, payment) lives in sessionStorage, so everything renders in the browser only.
export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.publicMetadata?.role === "admin" || (await isApiAdmin())) redirect("/dashboard");

  return (
    <Suspense>
      <ClientOnly>
        <OnboardingGate>
          <MyAccountProvider>
            <ClientShell>{children}</ClientShell>
          </MyAccountProvider>
        </OnboardingGate>
      </ClientOnly>
    </Suspense>
  );
}

// Until the cutover (API_BACKEND=worker) the roles live in D1 behind the Worker, so only Clerk's
// role is checked; a failed lookup also falls back to it.
async function isApiAdmin() {
  if (!nextApiEnabled()) return false;
  try {
    return await isAdmin();
  } catch (error) {
    console.error("[client layout] role lookup failed:", error);
    return false;
  }
}
