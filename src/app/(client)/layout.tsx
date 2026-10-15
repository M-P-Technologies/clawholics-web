import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import ClientShell from "@/components/features/client/shell/ClientShell";
import MyAccountProvider from "@/components/features/client/shell/MyAccountProvider";
import { ClientOnly } from "@/components/guards/ClientOnly";
import { OnboardingGate } from "@/components/guards/OnboardingGate";
import { isApiAdmin } from "@/server/auth";

// The client app is personal: search engines must not list it
export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

// Every screen under /my needs a signed-in client, checked on the server first. Admins have no
// client profile and go to their dashboard (either role counts, as in the admin layout). In the
// browser, OnboardingGate sends a client without a finished profile to /onboarding, and
// MyAccountProvider loads the account once for every tab.
// Router state (booking, payment) lives in sessionStorage, so everything renders in the browser only.
export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.publicMetadata?.role === "admin" || (await isApiAdmin("client layout"))) redirect("/dashboard");

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
