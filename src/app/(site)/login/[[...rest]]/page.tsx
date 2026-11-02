"use client";

import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { AuthTabs } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { useRedirectIfSignedIn } from "@/hooks/useRedirectIfSignedIn";
import { useLoginReturn } from "@/hooks/useLoginReturn";
import { withReturn } from "@/lib/loginReturn";

function LoginScreen() {
  // Coming from a service page to book: back to it after logging in
  const returnTo = useLoginReturn();
  useRedirectIfSignedIn(returnTo);

  return (
    <PageShell>
      <Section innerClassName="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start gap-3 max-lg:py-12 lg:justify-center">
        <AuthTabs current="login" returnTo={returnTo} />
        <SignIn
          routing="path"
          path="/login"
          signUpUrl={withReturn("/signup", returnTo)}
          fallbackRedirectUrl={returnTo ?? "/my"}
          forceRedirectUrl={returnTo ?? "/my"}
          appearance={clerkAppearance}
        />
      </Section>
    </PageShell>
  );
}

export default function Login() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
