"use client";

import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { AuthTabs } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { useRedirectIfSignedIn } from "@/hooks/useRedirectIfSignedIn";
import { useLoginReturn } from "@/hooks/useLoginReturn";
import { withReturn } from "@/lib/loginReturn";

function SignupScreen() {
  const returnTo = useLoginReturn();
  useRedirectIfSignedIn(returnTo);

  return (
    <PageShell>
      <Section innerClassName="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start gap-3 max-lg:py-12 lg:justify-center">
        <AuthTabs current="signup" returnTo={returnTo} />
        <SignUp
          routing="path"
          path="/signup"
          signInUrl={withReturn("/login", returnTo)}
          fallbackRedirectUrl={returnTo ?? "/my"}
          forceRedirectUrl={returnTo ?? "/my"}
          appearance={clerkAppearance}
        />
      </Section>
    </PageShell>
  );
}

export default function Signup() {
  return (
    <Suspense>
      <SignupScreen />
    </Suspense>
  );
}
