"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthTabs } from "@/components/molecules";
import PageShell from "@/components/layout/PageShell";
import Section from "@/components/layout/Section";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { useRedirectIfSignedIn } from "@/hooks/useRedirectIfSignedIn";

export default function Signup() {
  useRedirectIfSignedIn();
  
  return (
    <PageShell>
      <Section innerClassName="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start gap-4 max-lg:pt-4 lg:justify-center">
        <AuthTabs current="signup" />
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          fallbackRedirectUrl="/my"
          forceRedirectUrl="/my"
          appearance={clerkAppearance}
        />
      </Section>
    </PageShell>
  );
}
